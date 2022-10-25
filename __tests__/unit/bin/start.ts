import { start, shutdown } from "../../../src/bin/start";

jest.mock("register-server-handlers");
jest.mock("sourced-repo-typeorm", () => {
  return {
    Repository: jest.fn(),
    persistenceLayer: {
      connect: jest.fn(() => Promise.resolve(true)),
      disconnect: jest.fn(() => Promise.resolve(true)),
    },
  };
});

jest.mock("express", () => {
  const m: any = {
    __esModule: true,
    Router: jest.fn(() => ({
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
    })),
  };

  m.default = jest.fn(() => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn(() => ({
      close: jest.fn(),
    })),
  }));
  m.default.urlencoded = jest.fn();
  m.default.json = jest.fn();

  return m;
});

jest.spyOn(process, "exit").mockImplementation(() => {
  return undefined as never;
});

describe("bin/start.ts", () => {
  it("should start our service", async () => {
    const express = await (await import("express")).default;
    const server = express();
    const { registerHandlers } = await import("register-server-handlers");
    await start(server, "./handlers");
    expect(registerHandlers).toBeCalled();
  });

  it("should throw an error if it cant connect to persistenceLayer", async () => {
    const { persistenceLayer } = await import("sourced-repo-typeorm");
    persistenceLayer.connect = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          reject(new Error("PSQL Error"));
        })
    );

    const express = await (await import("express")).default;
    const server = express();
    await start(server, "./handlers");

    // expect(server.log.error).toBeCalled();
    expect(process.exit).toBeCalledWith(1);
  });

  it("should shutdown server and persistencelayer", async () => {
    const { persistenceLayer } = await import("sourced-repo-typeorm");
    const server = {
      log: {
        info: jest.fn(),
      },
      close: jest.fn(() => Promise.resolve(true)),
    };
    await shutdown(server)();

    expect(server.close).toBeCalled();
    expect(persistenceLayer.disconnect).toBeCalled();
  });
});
