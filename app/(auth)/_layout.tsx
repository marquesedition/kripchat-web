import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";

export default function AuthLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);

  if (initialized && session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
