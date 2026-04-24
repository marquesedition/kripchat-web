import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { normalizeUsername } from "@/lib/validation";
import type { Profile } from "@/features/chat/types";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const cleanUsername = normalizeUsername(username);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        username: cleanUsername
      }
    }
  });
  if (error) throw error;
  return data.session;
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

export function getSessionUserId(session: Session | null) {
  return session?.user.id ?? null;
}
