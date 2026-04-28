import { isEmailNotConfirmedError, resolveEmailConfirmRedirectUrl, signInWithEmail, signOut, signUpWithEmail } from "@/features/auth/authService";
import { ensureProvisionalE2EEIdentity } from "@/lib/e2ee";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn()
  }
}));

jest.mock("@/lib/e2ee", () => ({
  ensureProvisionalE2EEIdentity: jest.fn(async () => ({
    version: 1,
    publicKey: "pub-key-1",
    secretKey: "sec-key-1",
    createdAt: "2026-01-01T00:00:00.000Z"
  }))
}));

describe("authService sign-up and auth error helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns confirmation-required metadata when Supabase creates user without session", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        session: null,
        user: { email: "agent@example.com" }
      },
      error: null
    });

    const result = await signUpWithEmail("Agent@Example.com", "12345678", "Agent_User");

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "agent@example.com",
      password: "12345678",
      options: {
        emailRedirectTo: "https://kripchat.com/auth/confirm",
        data: {
          username: "agent_user",
          e2ee_public_key: "pub-key-1"
        }
      }
    });
    expect(ensureProvisionalE2EEIdentity).toHaveBeenCalledWith("agent@example.com");
    expect(result.emailConfirmationRequired).toBe(true);
    expect(result.email).toBe("agent@example.com");
  });

  it("does not require confirmation when Supabase already returns a session", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
        user: { email: "agent@example.com" }
      },
      error: null
    });

    const result = await signUpWithEmail("agent@example.com", "12345678", "agent_user");
    expect(result.emailConfirmationRequired).toBe(false);
  });

  it("detects the email-not-confirmed error by code or message", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed", message: "Auth failed" })).toBe(true);
    expect(isEmailNotConfirmedError({ code: "400", message: "Email not confirmed" })).toBe(true);
    expect(isEmailNotConfirmedError({ code: "401", message: "Invalid login credentials" })).toBe(false);
  });

  it("signs in using a trimmed email and returns the session", async () => {
    const session = { user: { id: "user-1" } };
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session },
      error: null
    });

    await expect(signInWithEmail(" agent@example.com ", "super-secret")).resolves.toEqual(session);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "agent@example.com",
      password: "super-secret"
    });
  });

  it("throws sign-in errors from Supabase", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: new Error("Invalid login credentials")
    });

    await expect(signInWithEmail("agent@example.com", "bad-pass")).rejects.toThrow("Invalid login credentials");
  });

  it("delegates sign-out to Supabase", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await expect(signOut()).resolves.toBeUndefined();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("throws sign-out errors from Supabase", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: new Error("Network error") });
    await expect(signOut()).rejects.toThrow("Network error");
  });

  it("resolves a standard public confirm URL from site origin", () => {
    expect(resolveEmailConfirmRedirectUrl("https://kripchat.com")).toBe("https://kripchat.com/auth/confirm");
    expect(resolveEmailConfirmRedirectUrl("https://kripchat.com/")).toBe("https://kripchat.com/auth/confirm");
  });
});
