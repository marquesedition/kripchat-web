import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidPassword, isValidUsername, normalizeUsername } from "@/lib/validation";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loading = useAuthStore((state) => state.loading);
  const signUp = useAuthStore((state) => state.signUp);

  async function onSubmit() {
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase required", "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.");
      return;
    }
    if (!isValidUsername(username) || !isValidPassword(password)) {
      Alert.alert("Check fields", "Use a 3-24 char hacker handle and an 8+ char password.");
      return;
    }
    try {
      const result = await signUp(normalizeUsername(username), password);
      if (result.session) {
        router.replace("/(tabs)");
        return;
      }
      Alert.alert(
        "Registro pendiente",
        "La cuenta se creó, pero Supabase no devolvió una sesión. Desactiva la verificación de registro en Supabase Auth para usar solo hacker_handle."
      );
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert("Registration failed", getUserFacingErrorMessage(error, "Unable to create account."));
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Ionicons name="key-outline" size={23} color={colors.green} />
              </View>
              <Text style={styles.kicker}>NEW OPERATIVE</Text>
              <Text style={styles.title}>Create Secure Account</Text>
            </View>
            <GlassCard style={styles.card}>
              <View style={styles.inputStack}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
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
              </View>
              <View style={styles.actionStack}>
                <GlassButton label={loading ? "Provisioning..." : "Register"} disabled={loading} onPress={onSubmit} style={styles.primaryButton} />
                <Text style={styles.notice}>Usa solo tu hacker_handle y password para entrar.</Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable style={styles.linkButton}>
                    <Text style={styles.linkText}>Already cleared? Log in</Text>
                  </Pressable>
                </Link>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg
  },
  panel: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center"
  },
  header: {
    marginBottom: spacing.md
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(60,255,107,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  kicker: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 11,
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "700"
  },
  card: {
    padding: spacing.md,
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
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
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
    minHeight: 52
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
