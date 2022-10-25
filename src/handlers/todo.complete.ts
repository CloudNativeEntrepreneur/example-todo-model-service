import { knativebus } from "knativebus";
import { repository } from "../repos/todoRepository";
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

  let todoInstance;
  request.log.info({
    msg: "⏳ handling todo.complete",
    id,
    address,
  });

  try {
    todoInstance = await repository.get(id);
  } catch (err) {
    const msg = `Cannot find ToDo with id ${id}`;
    request.log.info({ msg: `🚨 ${msg}: ${err}` });
    return response.status(500).json({ msg });
  }

  if (!todoInstance) {
    const msg = `🚨 Todo ${id} not found`;
    request.log.info({ msg });
    return response.status(404).json({ msg });
  }

  request.log.info({
    msg: "⏳ found todo",
    id,
    address,
    todoInstance,
  });

  if (address !== todoInstance.address) {
    request.log.info({
      msg: `🚨 Can only change todos with address ${address}`,
      id,
      address,
    });

    return response.status(401).json({ message: "Unauthorized" });
  }

  if (todoInstance.completed) {
    // TODO: check what best error code to use here is
    const msg = "🚨 Todo is already completed - cannot complete again";
    request.log.error({ msg, id: todoInstance.id });
    return response.status(500).json({ msg });
  }

  todoInstance.on(
    "completed",
    await onSuccess({ request, response, bus, sync, enableEventPublishing })
  );

  todoInstance.complete();

  try {
    await repository.commit(todoInstance);
  } catch (err: any) {
    request.log.error({
      msg: "🚨 Error calling repository.commit",
      err,
    });

    if (sync) {
      return response.status(500).json({ message: err.statusText });
    } else {
      return response.status(500).send();
    }
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
  async (completedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessAsync",
      completedTodo,
    });
    const domainEvent = "todo.completed";

    if (enableEventPublishing) {
      await bus.publish(domainEvent, completedTodo);
      request.log.info({
        msg: "✅ Event published",
        domainEvent,
        id: completedTodo.id,
        address: completedTodo.address,
      });
    }

    // Respond to Sender
    // return response.status(201).json({
    //   id: completedTodo.id,
    //   address: completedTodo.address,
    //   completed: completedTodo.completed,
    //   todo: completedTodo.todo,
    // });
    return response.status(202).send();
  };

// Send to denormalizer, and pass on it's response as this response
// also, publish events, fire and forget, if enabled, noting that denormalize was already completed
export const onSuccessSync =
  (options: {
    request: any;
    response: any;
    bus: any;
    enableEventPublishing: boolean;
  }) =>
  async (completedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessSync",
      id: completedTodo.id,
      address: completedTodo.address,
    });
    const domainEvent = "todo.completed";

    // Sync send event to denormalizer
    request.log.info({
      msg: "⏳ sending to denormalizer",
      domainEvent,
      id: completedTodo.id,
      address: completedTodo.address,
    });
    const syncSendResponse = await syncSendToDenormalizers(
      domainEvent,
      completedTodo
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
          Object.assign({}, completedTodo, {
            completedDenormalizers: ["example-hasura"],
          })
        );

        request.log.info({
          msg: "✅ Event published",
          domainEvent,
          id: completedTodo.id,
          address: completedTodo.address,
        });
      }

      // Respond to Hasura
      return response
        .status(syncSendResponse.status)
        .json({ ...denormalizerResult.update_todos_by_pk });
    }
  };
