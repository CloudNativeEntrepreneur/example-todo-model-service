describe("config - sync send disabled", () => {
  beforeAll(() => {
    process.env.ENABLE_EVENT_PUBLISHING = "false";
  });

  it("should configure important things", async () => {
    console.log(
      "ENABLE_EVENT_PUBLISHING",
      typeof process.env.ENABLE_EVENT_PUBLISHING,
      process.env.ENABLE_EVENT_PUBLISHING
    );
    const { config } = await import("../../src/config.js");
    expect(config.port).toBeDefined();
    expect(config.enableEventPublishing).toBe(false);
  });
});
