import { ToDo } from "../../../src/models/ToDo";
import debug from "debug";

const log = debug("tests");

// digest and enqueue work with repositories - we don't have a repository in these tests
ToDo.prototype.digest = jest.fn();
ToDo.prototype.enqueue = ToDo.prototype.emit;

describe("ToDo", () => {
  it("should construct a ToDo model", () => {
    const todoInstance = new ToDo();

    expect(typeof todoInstance.digest).toBe("function");
    expect(typeof todoInstance.on).toBe("function");
    expect(typeof todoInstance.emit).toBe("function");
  });

  it("big test with most methods", () => {
    const todoInstance = new ToDo();
    const todoInstance2 = new ToDo();
    const todoToCreate = {
      id: "todo-id-test",
      address: "0x000000test0000000",
      todo: "The only task that matters",
      createdAt: new Date(),
    };

    const todoToCreate2 = {
      id: "todo-id-test-2",
      address: "0x000000test0000000",
      todo: "The only other task that matters",
    };

    todoInstance.initialize(todoToCreate);
    expect(todoInstance.id).toBe(todoToCreate.id);
    expect(todoInstance.address).toBe(todoToCreate.address);
    expect(todoInstance.todo).toBe(todoToCreate.todo);
    expect(todoInstance.createdAt).toBe(todoToCreate.createdAt);
    expect(todoInstance.completed).toBe(false);
    expect(todoInstance.completedAt).toBe(undefined);

    todoInstance.complete();
    expect(todoInstance.completed).toBe(true);
    expect(todoInstance.completedAt).toBeDefined();

    todoInstance2.initialize(todoToCreate2);
    const completedAt = new Date();
    todoInstance2.complete({ completedAt });
    expect(todoInstance2.completed).toBe(true);
    expect(todoInstance2.completedAt).toBe(completedAt);

    todoInstance.reopen();
    expect(todoInstance.completed).toBe(false);
    expect(todoInstance.completedAt).toBe(undefined);
  });
});
