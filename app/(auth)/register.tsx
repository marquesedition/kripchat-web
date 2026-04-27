import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Link, router } from "expo-router";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { colors, radii, spacing } from "@/lib/theme";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail, isValidPassword, isValidUsername, normalizeUsername } from "@/lib/validation";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loading = useAuthStore((state) => state.loading);
  const signUp = useAuthStore((state) => state.signUp);

  async function onSubmit() {
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase required", "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.");
      return;
    }
    if (!isValidEmail(email) || !isValidUsername(username) || !isValidPassword(password)) {
      Alert.alert("Check fields", "Use a valid email, a 3-24 char hacker handle, and an 8+ char password.");
      return;
    }
    try {
      const result = await signUp(email, password, normalizeUsername(username));
      if (result.emailConfirmationRequired) {
        Alert.alert(
          "Email confirmation required",
          `We sent a confirmation link to ${result.email}. Confirm it before logging in.`
        );
        router.replace("/(auth)/login");
        return;
      }
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Registration failed", error instanceof Error ? error.message : "Unable to create account.");
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Text style={styles.title}>Create your secure handle.</Text>
        <GlassCard style={styles.card}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="operator@email.com"
            placeholderTextColor={colors.faint}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            autoCapitalize="none"
            placeholder="hacker_handle"
            placeholderTextColor={colors.faint}
            value={username}
            onChangeText={(value) => setUsername(normalizeUsername(value))}
            style={styles.input}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            placeholder="password"
            placeholderTextColor={colors.faint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <GlassButton label={loading ? "Provisioning..." : "Register"} disabled={loading} onPress={onSubmit} />
          <Text style={styles.notice}>Email verification is required before you can start chatting.</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkText}>Already cleared? Log in</Text>
            </Pressable>
          </Link>
        </GlassCard>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    marginBottom: spacing.lg
  },
  card: {
    padding: spacing.md,
    gap: 12
  },
  input: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8
  },
  notice: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  linkText: {
    color: colors.blue,
    fontWeight: "700"
  }
});
