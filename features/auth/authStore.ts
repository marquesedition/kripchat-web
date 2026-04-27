import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import {
  fetchProfile,
  signInWithEmail,
  signOut as signOutService,
  signUpWithEmail,
  syncE2EEPublicKey,
  updateProfile,
  type SignUpResult
} from "@/features/auth/authService";
import type { Profile } from "@/features/chat/types";
import { ensureE2EEIdentity } from "@/lib/e2ee";
import { supabase } from "@/lib/supabase";

let authSubscriptionBound = false;

async function loadProfile(userId: string) {
  try {
    return await fetchProfile(userId);
  } catch (error) {
    console.warn("Unable to load Supabase profile", error);
    return null;
  }
}

async function loadPreparedProfile(userId: string) {
  const identity = await ensureE2EEIdentity(userId);
  const profile = await loadProfile(userId);
  if (!profile) return null;
  if (profile.e2ee_public_key === identity.publicKey) return profile;

  try {
    return (await syncE2EEPublicKey(userId, identity.publicKey)) ?? { ...profile, e2ee_public_key: identity.publicKey };
  } catch (error) {
    console.warn("Unable to publish E2EE public key", error);
    return { ...profile, e2ee_public_key: identity.publicKey };
  }
}

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (patch: Pick<Profile, "username" | "avatar_url" | "push_token">) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  bootstrap: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session, initialized: true });
      if (data.session?.user.id) {
        const profile = await loadPreparedProfile(data.session.user.id);
        set({ profile });
      }
    } catch (error) {
      console.warn("Unable to bootstrap Supabase auth", error);
      set({ session: null, profile: null, initialized: true });
    }

    if (authSubscriptionBound) return;
    authSubscriptionBound = true;

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session?.user.id) {
        const profile = await loadPreparedProfile(session.user.id);
        set({ profile });
      } else {
        set({ profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const session = await signInWithEmail(email, password);
      const profile = session?.user.id ? await loadPreparedProfile(session.user.id) : null;
      set({ session, profile });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, username) => {
    set({ loading: true });
    try {
      const result = await signUpWithEmail(email, password, username);
      const profile = result.session?.user.id ? await loadPreparedProfile(result.session.user.id) : null;
      set({ session: result.session, profile });
      return result;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await signOutService();
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await loadPreparedProfile(userId);
    set({ profile });
  },

  saveProfile: async (patch) => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await updateProfile(userId, patch);
    set({ profile });
  }
}));
