import { supabase } from "./client";

export async function blockUser(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth.user?.id;
  if (!blockerId) throw new Error("Sign in before blocking users.");
  const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth.user?.id;
  if (!blockerId) throw new Error("Sign in before unblocking users.");
  const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function getBlockedUsers() {
  const { data, error } = await supabase.from("blocked_users").select("blocked_id, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function isUserBlocked(userId: string) {
  const blocked = await getBlockedUsers();
  return blocked.some((row) => row.blocked_id === userId);
}
