import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const hasValidSupabaseUrl = Boolean(supabaseUrl?.startsWith("https://") && !supabaseUrl.includes("your-project"));
const hasValidSupabaseKey = Boolean(
  supabaseAnonKey &&
    supabaseAnonKey !== "your-public-anon-key" &&
    (supabaseAnonKey.startsWith("sb_publishable_") || supabaseAnonKey.startsWith("eyJ"))
);

export const isSupabaseConfigured = hasValidSupabaseUrl && hasValidSupabaseKey;
const safeSupabaseUrl = supabaseUrl?.trim() || "https://placeholder.supabase.co";
const safeSupabaseAnonKey = supabaseAnonKey?.trim() || "placeholder-anon-key";

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
  safeSupabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: canUsePersistentStorage,
      persistSession: canUsePersistentStorage,
      detectSessionInUrl: false
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
