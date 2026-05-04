import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import {
  fetchProfile,
  signInWithHandle,
  signOut as signOutService,
  signUpWithHandle,
  syncE2EEPublicKey,
  updateProfile,
  type SignUpResult
} from "@/features/auth/authService";
import type { Profile } from "@/features/chat/types";
import { ensureE2EEIdentity, promoteProvisionalE2EEIdentity } from "@/lib/e2ee";
import { supabase } from "@/lib/supabase";
import { registerCurrentDevice } from "@/src/lib/supabase/devices";
import { registerForPushNotifications } from "@/services/notifications";

let authSubscriptionBound = false;

async function loadProfile(userId: string) {
  try {
    return await fetchProfile(userId);
  } catch (error) {
    console.warn("Unable to load Supabase profile", error);
    return null;
  }
}

async function loadPreparedProfile(userId: string, email?: string | null) {
  if (email) {
    try {
      await promoteProvisionalE2EEIdentity(email, userId);
    } catch (error) {
      console.warn("Unable to promote provisional E2EE identity", error);
    }
  }

  const identity = await ensureE2EEIdentity(userId);
  const profile = await loadProfile(userId);
  try {
    await registerCurrentDevice(userId, "KripChat device");
  } catch (error) {
    console.warn("Unable to register current E2EE device", error);
  }
  if (!profile) return null;
  if (profile.e2ee_public_key) return profile;

  try {
    return (await syncE2EEPublicKey(userId, identity.publicKey)) ?? { ...profile, e2ee_public_key: identity.publicKey };
  } catch (error) {
    console.warn("Unable to publish E2EE public key", error);
    return { ...profile, e2ee_public_key: identity.publicKey };
  }
}

async function syncPushToken(userId: string, profile: Profile | null) {
  if (!profile) return null;

  try {
    const pushToken = await registerForPushNotifications();
    if (!pushToken || profile?.push_token === pushToken) return profile;
    return await updateProfile(userId, {
      username: profile.username,
      avatar_url: profile.avatar_url,
      push_token: pushToken
    });
  } catch (error) {
    console.warn("Unable to register push notifications", error);
    return profile;
  }
}

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<SignUpResult>;
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
        const profile = await syncPushToken(
          data.session.user.id,
          await loadPreparedProfile(data.session.user.id, data.session.user.email)
        );
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
        const profile = await syncPushToken(session.user.id, await loadPreparedProfile(session.user.id, session.user.email));
        set({ profile });
      } else {
        set({ profile: null });
      }
    });
  },

  signIn: async (username, password) => {
    set({ loading: true });
    try {
      const session = await signInWithHandle(username, password);
      const profile = session?.user.id ? await syncPushToken(session.user.id, await loadPreparedProfile(session.user.id, session.user.email)) : null;
      set({ session, profile });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (username, password) => {
    set({ loading: true });
    try {
      const result = await signUpWithHandle(username, password);
      const profile = result.session?.user.id
        ? await syncPushToken(result.session.user.id, await loadPreparedProfile(result.session.user.id, result.session.user.email))
        : null;
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
    const email = get().session?.user.email;
    if (!userId) return;
    const profile = await loadPreparedProfile(userId, email);
    set({ profile });
  },

  saveProfile: async (patch) => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const profile = await updateProfile(userId, patch);
    set({ profile });
  }
}));
