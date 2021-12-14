import { knativebus } from "knativebus";
import { todoRepository } from "../repos/todoRepository.js";
import { config } from "../config.js";
import axios from "axios";

const bus = knativebus(config.bus);

export const where = (message): boolean =>
  !!(message && message.data && message.data.id);

export const handle = async (
  request,
  response,
  command,
  handlerOptions: any = {}
): Promise<void> => {
  const sync = !!handlerOptions.sync;
  const enableEventPublishing = !!handlerOptions.enableEventPublishing;
  const { data } = command;
  const { id } = data;
  const session = request?.body?.session_variables;
  const address = session && session["x-hasura-user-id"];

  if (!address) {
    return response.status(401).json({ message: "Unauthorized" });
  }

  request.log.info({
    msg: "⏳ handling todo.reopen",
    id,
  });

  let todoInstance;

  try {
    todoInstance = await todoRepository.get(id);
  } catch (err) {
    return response
      .status(500)
      .json({ message: `Cannot find ToDo with id ${id}` });
  }

  if (!todoInstance) {
    const msg = `🚨 Todo ${id} not found`;
    request.log.info({ msg });
    return response.status(404).json({ msg });
  }

  if (address !== todoInstance.address) {
    return response.status(401).json({ message: "Unauthorized" });
  }

  if (!todoInstance.completed) {
    // TODO: check what best error code to use here is
    return response
      .status(500)
      .json({ message: "Todo is not completed - cannot reopen" });
  }

  todoInstance.on(
    "reopened",
    await onSuccess({ request, response, bus, sync, enableEventPublishing })
  );

  todoInstance.reopen();

  try {
    await todoRepository.commit(todoInstance);
  } catch (err) {
    request.log.error({
      msg: "🚨 Error calling todoRepository.commit",
      err,
    });

    response.status(500).json(err);

    const termSignal: NodeJS.Signals = "SIGTERM";
    process.emit(termSignal, termSignal);
  }
};

const syncSendToDenormalizers = (event, data): Promise<any> => {
  return axios.post(`${config.denormalizers["example-hasura"]}/${event}`, {
    input: data,
  });
};

export const onSuccess = (options: {
  request;
  response;
  bus;
  sync: boolean;
  enableEventPublishing: boolean;
}) => {
  const { request, response, bus, sync, enableEventPublishing } = options;
  if (sync) {
    return onSuccessSync({ request, response, bus, enableEventPublishing });
  } else {
    return onSuccessAsync({ request, response, bus, enableEventPublishing });
  }
};

// publish events, fire and forget, if enabled, and return created item
export const onSuccessAsync =
  (options: {
    request: any;
    response: any;
    bus: any;
    enableEventPublishing: boolean;
  }) =>
  async (reopenedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessAsync",
      reopenedTodo,
    });
    const domainEvent = "todo.reopened";

    if (enableEventPublishing) {
      await bus.publish(domainEvent, reopenedTodo);
      request.log.info({
        msg: "✅ Event published",
        domainEvent,
        id: reopenedTodo.id,
        address: reopenedTodo.address,
      });
    }

    // Respond to Sender
    // return response.status(201).json({
    //   id: reopenedTodo.id,
    //   address: reopenedTodo.address,
    //   reopened: reopenedTodo.reopened,
    //   todo: reopenedTodo.todo,
    // });
    return response.status(202).send();
  };

// Send to denormalizer, and pass on it's response as this response
// also, publish events, fire and forget, if enabled, noting that denormalize was already reopened
export const onSuccessSync =
  (options: {
    request: any;
    response: any;
    bus: any;
    enableEventPublishing: boolean;
  }) =>
  async (reopenedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessSync",
      id: reopenedTodo.id,
      address: reopenedTodo.address,
    });
    const domainEvent = "todo.reopened";

    // Sync send event to denormalizer
    request.log.info({
      msg: "⏳ sending to denormalizer",
      domainEvent,
      id: reopenedTodo.id,
      address: reopenedTodo.address,
    });
    const syncSendResponse = await syncSendToDenormalizers(
      domainEvent,
      reopenedTodo
    );
    const { data } = syncSendResponse;
    const denormalizerResult = data.data;
    const denormalizerErrors = data.errors;

    // if denormalizer operation errors, then throw error
    if (denormalizerErrors) {
      request.log.error({
        msg: "🚨 Error - denormalizer update read model response",
        data,
      });
      return response.status(400).json(denormalizerErrors[0]);
    } else {
      if (enableEventPublishing) {
        await bus.publish(
          domainEvent,
          Object.assign({}, reopenedTodo, {
            completedDenormalizers: ["example-hasura"],
          })
        );

        request.log.info({
          msg: "✅ Event published",
          domainEvent,
          id: reopenedTodo.id,
          address: reopenedTodo.address,
        });
      }

      // Respond to Hasura
      return response
        .status(syncSendResponse.status)
        .json({ ...denormalizerResult.update_todos_by_pk });
    }
  };
