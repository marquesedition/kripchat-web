import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureProvisionalE2EEIdentity } from "@/lib/e2ee";
import { normalizeUsername } from "@/lib/validation";
import type { Profile } from "@/features/chat/types";

export type SignUpResult = {
  session: Session | null;
  emailConfirmationRequired: boolean;
  email: string;
};

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveEmailConfirmRedirectUrl(origin?: string) {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return `${trimSlash(fromEnv)}/auth/confirm`;
  if (origin) return `${trimSlash(origin)}/auth/confirm`;
  return "https://kripchat.com/auth/confirm";
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const cleanUsername = normalizeUsername(username);
  const cleanEmail = email.trim().toLowerCase();
  const provisionalIdentity = await ensureProvisionalE2EEIdentity(cleanEmail);
  const webOrigin = typeof window !== "undefined" && window.location ? window.location.origin : undefined;
  const emailRedirectTo = resolveEmailConfirmRedirectUrl(webOrigin);
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        username: cleanUsername,
        e2ee_public_key: provisionalIdentity.publicKey
      }
    }
  });
  if (error) throw error;
  return {
    session: data.session,
    emailConfirmationRequired: Boolean(data.user && !data.session),
    email: data.user?.email ?? cleanEmail
  } satisfies SignUpResult;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: Pick<Profile, "username" | "avatar_url" | "push_token">) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: normalizeUsername(patch.username),
      avatar_url: patch.avatar_url,
      push_token: patch.push_token
    })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function syncE2EEPublicKey(userId: string, publicKey: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      e2ee_public_key: publicKey
    })
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export function getSessionUserId(session: Session | null) {
  return session?.user.id ?? null;
}

export function isEmailNotConfirmedError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeMessage = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const maybeCode = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = maybeMessage.toLowerCase();
  const code = maybeCode.toLowerCase();

  return code === "email_not_confirmed" || message.includes("email not confirmed");
}
