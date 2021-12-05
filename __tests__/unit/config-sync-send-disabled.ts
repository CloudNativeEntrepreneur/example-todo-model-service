describe("config - sync send disabled", () => {
  beforeAll(() => {
    process.env.ENABLE_SYNC_SEND_TO_DENORMALIZER = "false";
  });

  it("should configure important things", async () => {
    console.log(
      "ENABLE_SYNC_SEND_TO_DENORMALIZER",
      typeof process.env.ENABLE_SYNC_SEND_TO_DENORMALIZER,
      process.env.ENABLE_SYNC_SEND_TO_DENORMALIZER
    );
    const { config } = await import("../../src/config.js");
    expect(config.port).toBeDefined();
    expect(config.enableSyncSendToDenormalizer).toBe(false);
  });
});
