import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { fetchProfile, signInWithEmail, signOut as signOutService, signUpWithEmail, updateProfile } from "@/features/auth/authService";
import type { Profile } from "@/features/chat/types";
import { supabase } from "@/lib/supabase";

async function loadProfile(userId: string) {
  try {
    return await fetchProfile(userId);
  } catch (error) {
    console.warn("Unable to load Supabase profile", error);
    return null;
  }
}

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
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
        const profile = await loadProfile(data.session.user.id);
        set({ profile });
      }
    } catch (error) {
      console.warn("Unable to bootstrap Supabase auth", error);
      set({ session: null, profile: null, initialized: true });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session?.user.id) {
        const profile = await loadProfile(session.user.id);
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
      const profile = session?.user.id ? await loadProfile(session.user.id) : null;
      set({ session, profile });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, username) => {
    set({ loading: true });
    try {
      const session = await signUpWithEmail(email, password, username);
      const profile = session?.user.id ? await loadProfile(session.user.id) : null;
      set({ session, profile });
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
    const profile = await fetchProfile(userId);
    set({ profile });
  },

  saveProfile: async (patch) => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await updateProfile(userId, patch);
    set({ profile });
  }
}));
