import { Entity } from "sourced";

export class ToDo extends Entity {
  id: string | undefined;
  address: string | undefined;
  todo: string | undefined;
  completed: boolean | undefined;
  removed: boolean | undefined;

  constructor(snapshot?: any, events?: any) {
    super();
    this.rehydrate(snapshot, events);
  }

  initialize(options: { address: string; id: string; todo: string }): void {
    const { address, id, todo } = options;
    this.id = id;
    this.address = address;
    this.todo = todo;
    this.completed = false;

    this.digest("initialize", options);
    this.enqueue("initialized", this.state());
  }

  complete() {
    this.completed = true;
    this.digest("complete", {});
    this.enqueue("completed", this.state());
  }

  reopen() {
    this.completed = false;
    this.digest("reopen", {});
    this.enqueue("reopened", this.state());
  }

  remove() {
    this.removed = true;
    this.digest("removed", {});
    this.enqueue("removed", this.state());
  }
}
