import { Redirect } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";

export default function Index() {
  const session = useAuthStore((state) => state.session);
  return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
}
