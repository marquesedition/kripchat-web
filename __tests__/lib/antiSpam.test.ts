describe("antiSpam window", () => {
  function loadCanSendMessage() {
    jest.resetModules();
    return require("@/lib/antiSpam") as { canSendMessage: (now?: number) => boolean };
  }

  it("allows up to eight sends inside the throttle window", () => {
    const { canSendMessage } = loadCanSendMessage();
    const now = 1_000;

    for (let index = 0; index < 8; index += 1) {
      expect(canSendMessage(now + index)).toBe(true);
    }

    expect(canSendMessage(now + 9)).toBe(false);
  });

  it("releases capacity after the window expires", () => {
    const { canSendMessage } = loadCanSendMessage();
    const now = 5_000;

    for (let index = 0; index < 8; index += 1) {
      expect(canSendMessage(now + index)).toBe(true);
    }

    expect(canSendMessage(now + 10_001)).toBe(true);
  });
});
