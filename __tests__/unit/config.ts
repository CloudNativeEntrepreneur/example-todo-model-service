describe("config", () => {
  it("should configure important things", async () => {
    const { config } = await import("../../src/config.js");
    expect(config.port).toBeDefined();
    expect(config.enableSyncSendToDenormalizer).toBe(true);
  });
});
