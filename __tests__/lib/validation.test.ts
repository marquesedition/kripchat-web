import { isValidEmail, isValidPassword, isValidUsername, normalizeUsername, sanitizeMessage } from "@/lib/validation";

describe("validation helpers", () => {
  it("accepts valid emails and rejects invalid ones", () => {
    expect(isValidEmail("agent@marquesedition.com")).toBe(true);
    expect(isValidEmail("agent")).toBe(false);
    expect(isValidEmail("agent@bad")).toBe(false);
  });

  it("normalizes and validates usernames", () => {
    expect(normalizeUsername("  Hacker Handle!! ")).toBe("hackerhandle");
    expect(isValidUsername("ops_team")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(normalizeUsername("contains space")).toBe("containsspace");
    expect(isValidUsername("!")).toBe(false);
  });

  it("requires passwords with at least eight characters", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("short")).toBe(false);
  });

  it("sanitizes messages and caps them at 2000 characters", () => {
    expect(sanitizeMessage("  hello   secure   world  ")).toBe("hello secure world");
    expect(sanitizeMessage("x".repeat(2100))).toHaveLength(2000);
  });
});
