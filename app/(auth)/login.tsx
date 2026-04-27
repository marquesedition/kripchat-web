import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { isEmailNotConfirmedError } from "@/features/auth/authService";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { useAuthStore } from "@/features/auth/authStore";
import { colors, radii, spacing } from "@/lib/theme";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loading = useAuthStore((state) => state.loading);
  const signIn = useAuthStore((state) => state.signIn);

  async function onSubmit() {
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase required", "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.");
      return;
    }
    if (!isValidEmail(email) || !password) {
      Alert.alert("Invalid login", "Enter a valid email and password.");
      return;
    }
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        Alert.alert("Email confirmation required", "Confirma tu email desde el mensaje de Supabase y luego inicia sesión.");
        return;
      }
      Alert.alert("Access denied", getUserFacingErrorMessage(error, "Unable to sign in."));
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.kicker}>KRIPCHAT</Text>
            <Text style={styles.title}>Private chat for your team.</Text>
            <Text style={styles.subtitle}>Sign in to message users, share files, and manage your profile.</Text>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.inputStack}>
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
                autoComplete="password"
                placeholder="password"
                placeholderTextColor={colors.faint}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>
            <View style={styles.actionStack}>
              <GlassButton label={loading ? "Authenticating..." : "Enter"} disabled={loading} onPress={onSubmit} style={styles.primaryButton} />
              <Link href="/(auth)/register" asChild>
                <Pressable style={styles.linkButton}>
                  <Text style={styles.linkText}>Need a handle? Register</Text>
                </Pressable>
              </Link>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  panel: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center"
  },
  header: {
    marginBottom: spacing.lg
  },
  kicker: {
    color: colors.green,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 10
  },
  title: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    padding: spacing.lg,
    gap: 0
  },
  inputStack: {
    gap: 12
  },
  actionStack: {
    marginTop: spacing.lg,
    gap: 12
  },
  input: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 10
  },
  primaryButton: {
    minHeight: 48
  },
  linkText: {
    color: colors.blue,
    fontWeight: "700"
  }
});
