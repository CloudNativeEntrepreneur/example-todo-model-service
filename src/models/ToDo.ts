import { Entity } from "sourced";

export class ToDo extends Entity {
  id: string | undefined;
  address: string | undefined;
  todo: string | undefined;
  completed: boolean | undefined;
  completedAt: Date | undefined;
  createdAt: Date | undefined;

  constructor(snapshot?: any, events?: any) {
    super();
    this.rehydrate(snapshot, events);
  }

  initialize(options: {
    address: string;
    createdAt?: Date;
    id: string;
    todo: string;
  }): void {
    options.createdAt = options.createdAt || new Date();
    const { address, createdAt, id, todo } = options;
    this.id = id;
    this.address = address;
    this.todo = todo;
    this.createdAt = createdAt;
    this.completed = false;

    this.digest("initialize", options);
    this.enqueue("initialized", this.state());
  }

  complete(options: { completedAt?: Date } = {}) {
    options.completedAt = options.completedAt || new Date();
    const { completedAt } = options;
    this.completed = true;
    this.completedAt = completedAt;
    this.digest("complete", options);
    this.enqueue("completed", this.state());
  }

  reopen() {
    this.completed = false;
    this.completedAt = undefined;
    this.digest("reopen", {});
    this.enqueue("reopened", this.state());
  }
}
