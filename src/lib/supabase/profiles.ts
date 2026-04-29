import { normalizeUsername } from "@/lib/validation";
import { supabase } from "./client";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function createProfile(input: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null; bio?: string | null }) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: input.id,
      username: normalizeUsername(input.username),
      display_name: input.displayName ?? null,
      avatar_url: input.avatarUrl ?? null,
      bio: input.bio ?? null
    })
    .select("id, username, display_name, avatar_url, bio, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as PublicProfile;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export async function searchProfilesByUsername(query: string) {
  const username = normalizeUsername(query);
  if (username.length < 2) return [];
  const { data, error } = await supabase.rpc("search_profiles_by_username_v2", { search_username: username });
  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

export async function updateProfile(userId: string, patch: Partial<Pick<PublicProfile, "username" | "display_name" | "avatar_url" | "bio">>) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...patch,
      username: patch.username ? normalizeUsername(patch.username) : undefined,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId)
    .select("id, username, display_name, avatar_url, bio, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as PublicProfile;
}
