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
    createdAt: Date | undefined;
    id: string;
    todo: string;
  }): void {
    const { address, createdAt, id, todo } = options;
    this.id = id;
    this.address = address;
    this.todo = todo;
    this.createdAt = createdAt || new Date();
    this.completed = false;

    options.createdAt = this.createdAt;

    this.digest("initialize", options);
    this.enqueue("initialized", this.state());
  }

  complete(options: { completedAt: Date }) {
    const { completedAt } = options;
    this.completed = true;
    this.completedAt = completedAt;
    this.digest("complete", options);
    this.enqueue("completed", this.state());
  }
}
