import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/features/auth/authStore";
import { usePresence } from "@/hooks/usePresence";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const initialized = useAuthStore((state) => state.initialized);
  const userId = useAuthStore((state) => state.session?.user.id);
  const segments = useSegments();
  const inChat = segments[0] === "chat" && Boolean(segments[1]);
  const inInbox = segments[0] === "(tabs)" && segments.length === 1;

  usePresence(userId, inChat || inInbox);

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[threadId]" options={{ animation: "slide_from_right" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg
  }
});
