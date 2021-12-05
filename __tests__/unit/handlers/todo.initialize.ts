import { v4 as uuidv4 } from "uuid";
import debug from "debug";

const log = debug("tests");

jest.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

// mock connection to db
jest.mock("../../../src/repos/todoRepository", () => ({
  __esModule: true,
  commit: jest.fn(),
  default: {},
}));

jest.mock("knativebus", () => ({
  knativebus: jest.fn((config) => ({
    publish: jest.fn(
      () =>
        new Promise((resolve, reject) => {
          resolve(true);
        })
    ),
  })),
}));

jest.mock("axios", () => {
  return {
    post: jest.fn(
      () =>
        new Promise((resolve, reject) => {
          resolve({
            data: {
              data: {
                insert_companies_one: {
                  id: "test-1",
                },
              },
            },
          });
        })
    ),
  };
});

let handle;
let onSuccess;
let onSuccessSync;
let onSuccessAsync;
let where;

describe("todo.initialize command handler", () => {
  beforeAll(async () => {
    const m = await import("../../../src/handlers/todo.initialize");

    handle = m.handle;
    onSuccess = m.onSuccess;
    onSuccessSync = m.onSuccessSync;
    onSuccessAsync = m.onSuccessAsync;
    where = m.where;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize a todo - unauthorized", async () => {
    const request = {
      body: {
        action: {
          name: "command_todo_initialize",
        },
        input: {},
      },
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };
    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };
    const command = {
      type: "todo.initialize",
      source: "Unit Tests",
      data: {
        address: "0x0000test0000",
        todo: "todo.initialize handler test",
      },
    };

    try {
      await handle(request, response, command);
    } catch (err) {
      log(err);
      throw err;
    }
    expect(response.status).toBeCalledWith(401);
  });

  it("should initialize a todo", async () => {
    const request = {
      body: {
        action: {
          name: "command_todo_initialize",
        },
        input: {},
        session_variables: {
          "x-hasura-user-id": "0xTestUser",
        },
      },
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };
    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };
    const command = {
      type: "todo.initialize",
      source: "Unit Tests",
      data: {
        todo: "todo.initialize handler test",
      },
    };

    try {
      await handle(request, response, command);
    } catch (err) {
      log(err);
      throw err;
    }
  });

  it("should initialize a todo and trigger sync success", async () => {
    const request = {
      body: {
        action: {
          name: "command_todo_initialize",
        },
        input: {},
      },
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };
    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };
    const command = {
      type: "todo.initialize",
      source: "Unit Tests",
      data: {
        address: "0x0000test0000",
        todo: "todo.initialize handler test sync",
      },
    };

    await handle(request, response, command, { sync: true });
    expect(response.status).toBeCalled();
  });
});

describe("where", () => {
  it("should filter messages", () => {
    const x = where({
      data: {
        id: "test",
        address: "0x0000test0000",
        createdAt: new Date(),
        todo: "where filters",
      },
    });

    expect(x).toBe(true);
  });
  it("should filter messages", () => {
    expect(where({})).toBe(false);
  });
});

describe("onSuccessSync - publishing enabled", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should publish event and response to caller", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    const fakeResult = {
      id: uuidv4(),
      completedDenormalizers: ["example-hasura"],
    };

    await onSuccessSync({
      request,
      response,
      bus,
      enableEventPublishing: true,
    })(fakeResult);
    expect(bus.publish).toBeCalledWith("todo.initialized", fakeResult);
    expect(response.status).toBeCalledWith(201);
  });

  it("fail to update readmodel", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const axios = require("axios");
    axios.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolve({
            data: { errors: ["Fake error"] },
          });
        })
    );

    const fakeResult = {
      id: uuidv4(),
      completedDenormalizers: ["example-hasura"],
    };

    await onSuccessSync({
      request,
      response,
      bus,
      enableEventPublishing: true,
    })(fakeResult);
    expect(response.status).toBeCalledWith(400);
    expect(bus.publish).not.toBeCalled();
  });
});

describe("onSuccessAsync - publishing enabled", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should publish event and response to caller", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    const fakeResult = {
      id: uuidv4(),
      completedDenormalizers: ["example-hasura"],
    };

    await onSuccessAsync({
      request,
      response,
      bus,
      enableEventPublishing: true,
    })(fakeResult);
    expect(bus.publish).toBeCalledWith("todo.initialized", fakeResult);
    expect(response.status).toBeCalledWith(201);
  });
});

describe("onSuccessAsync - publishing disabled", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should not publish event and then send new item to caller", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    const fakeResult = {
      id: uuidv4(),
      completedDenormalizers: ["example-hasura"],
    };

    await onSuccessAsync({
      request,
      response,
      bus,
      enableEventPublishing: false,
    })(fakeResult);
    expect(bus.publish).not.toBeCalled();
    expect(response.status).toBeCalledWith(201);
  });
});

describe("onSuccess", () => {
  it("should switch between async and sync callback - true", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    const fakeResult = {
      id: uuidv4(),
      completedDenormalizers: ["example-hasura"],
    };

    await onSuccess({
      request,
      response,
      bus,
      enableEventPublishing: false,
      sync: true,
    })(fakeResult);
    expect(bus.publish).not.toBeCalled();
    expect(response.status).toBeCalledWith(201);
  });

  it("should switch between async and sync callback - false", async () => {
    const { knativebus } = await import("knativebus");
    const bus = knativebus();

    const request = {
      body: {},
      log: {
        info: jest.fn(),
        error: jest.fn(),
      },
    };

    const response = {
      status: jest.fn(() => ({
        send: jest.fn(),
        json: jest.fn(),
      })),
    };

    const fakeResult = {
      id: uuidv4(),
    };

    await onSuccess({
      request,
      response,
      bus,
      enableEventPublishing: false,
      sync: false,
    })(fakeResult);
    expect(bus.publish).not.toBeCalled();
    expect(response.status).toBeCalledWith(201);
  });
});
