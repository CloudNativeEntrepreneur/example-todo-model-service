import { repository } from "../../../src/repos/todoRepository";

jest.mock("sourced-repo-typeorm", () => {
  return {
    Repository: jest.fn(),
    persistenceLayer: jest.fn(),
  };
});

describe("repos/todoRepository", () => {
  it("is a singleton", async () => {
    const repo = await import("sourced-repo-typeorm");

    const mod2 = await import("../../../src/repos/todoRepository");
    const mod3 = await import("../../../src/repos/todoRepository");

    const instance2 = mod2.repository;
    const instance3 = mod3.repository;

    expect(repo.Repository).toHaveBeenCalledTimes(1);
    expect(repository).toBeDefined();
    expect(repository).toBe(instance2);
    expect(instance2).toBe(instance3);
  });
});
