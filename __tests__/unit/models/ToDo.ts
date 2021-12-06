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
    expect(todoInstance.completed).toBe(false);

    todoInstance.complete();
    expect(todoInstance.completed).toBe(true);

    todoInstance2.initialize(todoToCreate2);
    todoInstance2.complete();
    expect(todoInstance2.completed).toBe(true);

    todoInstance.reopen();
    expect(todoInstance.completed).toBe(false);

    todoInstance.remove();
    expect(todoInstance.removed).toBe(true);
  });
});
