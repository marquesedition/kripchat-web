import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const encryptedMediaBucket = process.env.EXPO_PUBLIC_ENCRYPTED_MEDIA_BUCKET?.trim() || "encrypted-media";

const hasValidSupabaseUrl = Boolean(supabaseUrl?.startsWith("https://") && !supabaseUrl.includes("your-project"));
const hasValidSupabaseKey = Boolean(
  supabasePublishableKey &&
    supabasePublishableKey !== "your-public-publishable-key" &&
    supabasePublishableKey !== "your-public-anon-key" &&
    (supabasePublishableKey.startsWith("sb_publishable_") || supabasePublishableKey.startsWith("eyJ"))
);

export const isSupabaseConfigured = hasValidSupabaseUrl && hasValidSupabaseKey;
const safeSupabaseUrl = supabaseUrl?.trim() || "https://placeholder.supabase.co";
const safeSupabasePublishableKey = supabasePublishableKey || "placeholder-publishable-key";

const canUsePersistentStorage = typeof window !== "undefined";
const storage = canUsePersistentStorage
  ? AsyncStorage
  : {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined
    };

export const supabase = createClient(
  safeSupabaseUrl,
  safeSupabasePublishableKey,
  {
    auth: {
      storage,
      autoRefreshToken: canUsePersistentStorage,
      persistSession: canUsePersistentStorage,
      detectSessionInUrl: canUsePersistentStorage
    },
    realtime: {
      params: {
        eventsPerSecond: 12
      }
    }
  }
);

if (canUsePersistentStorage) {
  AppState.addEventListener("change", (state) => {
    if (!isSupabaseConfigured) return;

    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
