import { knativebus } from "knativebus";
import { ToDo } from "../models/ToDo.js";
import { todoRepository } from "../repos/todoRepository.js";
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
  const { data } = command;
  const { todo } = data.todo;
  const session = request?.body?.session_variables;
  const address = session && session["x-hasura-user-id"];

  if (!address) {
    return response.status(401).json({ message: "Unauthorized" });
  }

  const sync = !!handlerOptions.sync;
  const enableEventPublishing = !!handlerOptions.enableEventPublishing;

  const id = uuid();
  const createdAt = new Date();

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
    createdAt,
  });

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
  return axios.post(
    `${config.denormalizers["example-hasura-readmodel"]}/${event}`,
    {
      input: data,
    }
  );
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
    return response.status(201).json({
      id: initializedTodo.id,
      address: initializedTodo.address,
      completed: initializedTodo.completed,
      createdAt: initializedTodo.createdAt,
      todo: initializedTodo.todo,
    });
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
    const { data } = await syncSendToDenormalizers(
      domainEvent,
      initializedTodo
    );
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
        .status(201)
        .json({ ...denormalizerResult.insert_todos_one });
    }
  };
