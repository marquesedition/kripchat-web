import {
  getAuthEmailForUsername,
  isEmailNotConfirmedError,
  resolveEmailConfirmRedirectUrl,
  signInWithHandle,
  signOut,
  signUpWithHandle,
  SupabaseAuthApiError
} from "@/features/auth/authService";
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

  it("derives the hidden Supabase auth email from the hacker handle", () => {
    expect(getAuthEmailForUsername(" Agent_User!! ")).toBe("agent_user@kripchat.invalid");
  });

  it("signs up with a hidden auth email and public hacker handle", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        session: null,
        user: { email: "agent_user@kripchat.invalid" }
      },
      error: null
    });

    const result = await signUpWithHandle("Agent_User", "12345678");

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "agent_user@kripchat.invalid",
      password: "12345678",
      options: {
        data: {
          username: "agent_user",
          e2ee_public_key: "pub-key-1"
        }
      }
    });
    expect(ensureProvisionalE2EEIdentity).toHaveBeenCalledWith("agent_user@kripchat.invalid");
    expect(result.username).toBe("agent_user");
  });

  it("does not require confirmation when Supabase already returns a session", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } },
        user: { email: "agent_user@kripchat.invalid" }
      },
      error: null
    });

    const result = await signUpWithHandle("agent_user", "12345678");
    expect(result.session).toEqual({ user: { id: "user-1" } });
  });

  it("detects the email-not-confirmed error by code or message", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed", message: "Auth failed" })).toBe(true);
    expect(isEmailNotConfirmedError({ code: "400", message: "Email not confirmed" })).toBe(true);
    expect(isEmailNotConfirmedError({ code: "401", message: "Invalid login credentials" })).toBe(false);
  });

  it("signs in using a normalized hacker handle and returns the session", async () => {
    const session = { user: { id: "user-1" } };
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session },
      error: null
    });

    await expect(signInWithHandle(" Agent_User ", "super-secret")).resolves.toEqual(session);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "agent_user@kripchat.invalid",
      password: "super-secret"
    });
  });

  it("throws sign-in errors from Supabase", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 }
    });

    await expect(signInWithHandle("agent_user", "bad-pass")).rejects.toThrow("Invalid login credentials");
  });

  it("preserves Supabase token endpoint code and message for UI observers", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 }
    });

    await expect(signInWithHandle("agent_user", "bad-pass")).rejects.toMatchObject({
      code: "invalid_credentials",
      message: "Invalid login credentials",
      status: 400,
      endpoint: "/auth/v1/token?grant_type=password"
    });
    await expect(signInWithHandle("agent_user", "bad-pass")).rejects.toBeInstanceOf(SupabaseAuthApiError);
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
