import { isEmailNotConfirmedError, signInWithEmail, signOut, signUpWithEmail } from "@/features/auth/authService";
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
        data: {
          username: "agent_user"
        }
      }
    });
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
});
