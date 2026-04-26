import { formatOpsCode, formatShortId } from "@/lib/opsIdentity";

describe("ops identity helpers", () => {
  it("formats deterministic operator codes from usernames", () => {
    const first = formatOpsCode("mia.delta");
    const second = formatOpsCode("mia.delta");
    const fallback = formatOpsCode("x");

    expect(first).toBe(second);
    expect(first).toMatch(/^MI-\d{3}$/);
    expect(fallback).toMatch(/^XX-\d{3}$/);
  });

  it("formats short ids in uppercase", () => {
    expect(formatShortId("a1b2c3d4")).toBe("A1B2");
  });
});
