import { healthcheck } from "../../../src/lib/healthcheck";

describe("healthcheck", () => {
  it("should respond with 200", () => {
    const send = jest.fn();
    const json = jest.fn();
    const reply = {
      status: jest.fn(() => ({
        send,
        json,
      })),
    };
    healthcheck({}, reply);
    expect(reply.status).toBeCalledWith(200);
    expect(send).toBeCalledWith("ok");
  });
});
