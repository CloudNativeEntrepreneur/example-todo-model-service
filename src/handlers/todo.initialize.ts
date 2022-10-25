import { knativebus } from "knativebus";
import { ToDo } from "../models/ToDo.js";
import { repository } from "../repos/todoRepository";
import { config } from "../config.js";
import axios from "axios";
import { v4 as uuid } from "uuid";

const bus = knativebus(config.bus);

export const where = (message): boolean =>
  !!(message && message.data && message.data.todo);

export const handle = async (
  request,
  response,
  command,
  handlerOptions: any = {}
): Promise<void> => {
  const sync = !!handlerOptions.sync;
  const enableEventPublishing = !!handlerOptions.enableEventPublishing;
  const { data } = command;
  const { todo } = data;
  const session = request?.body?.session_variables;
  const address = session && session["x-hasura-user-id"];

  if (!address) {
    return response.status(401).json({ message: "Unauthorized" });
  }

  const id = uuid();

  request.log.info({
    msg: "⏳ handling todo.initialize",
    id,
  });

  const todoInstance = new ToDo();

  todoInstance.on(
    "initialized",
    await onSuccess({ request, response, bus, sync, enableEventPublishing })
  );

  todoInstance.initialize({
    address,
    id,
    todo,
  });

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
  async (initializedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessAsync",
      initializedTodo,
    });
    const domainEvent = "todo.initialized";

    if (enableEventPublishing) {
      await bus.publish(domainEvent, initializedTodo);
      request.log.info({
        msg: "✅ Event published",
        domainEvent,
        id: initializedTodo.id,
        address: initializedTodo.address,
      });
    }

    // Respond to Sender
    // return response.status(202).json({
    //   id: initializedTodo.id,
    //   address: initializedTodo.address,
    //   completed: initializedTodo.completed,
    //   todo: initializedTodo.todo,
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
  async (initializedTodo): Promise<void> => {
    const { request, response, bus, enableEventPublishing } = options;
    request.log.info({
      msg: "✅ success - starting onSuccessSync",
      id: initializedTodo.id,
      address: initializedTodo.address,
    });
    const domainEvent = "todo.initialized";

    // Sync send event to denormalizer
    request.log.info({
      msg: "⏳ sending to denormalizer",
      domainEvent,
      id: initializedTodo.id,
      address: initializedTodo.address,
    });
    const syncSendResponse = await syncSendToDenormalizers(
      domainEvent,
      initializedTodo
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
          Object.assign({}, initializedTodo, {
            completedDenormalizers: ["example-hasura"],
          })
        );

        request.log.info({
          msg: "✅ Event published",
          domainEvent,
          id: initializedTodo.id,
          address: initializedTodo.address,
        });
      }

      // Respond to Hasura
      return response
        .status(syncSendResponse.status)
        .json({ ...denormalizerResult.insert_todos_one });
    }
  };
