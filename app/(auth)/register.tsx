import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { colors, fonts, radii, spacing } from "@/lib/theme";
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
      Alert.alert(
        "Confirmación de email requerida",
        `Registro completado. Revisa el correo de Supabase en ${result.email} y confirma tu email antes de iniciar sesión.`
      );
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert("Registration failed", getUserFacingErrorMessage(error, "Unable to create account."));
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="key-outline" size={24} color={colors.green} />
            </View>
            <Text style={styles.kicker}>NEW OPERATIVE</Text>
            <Text style={styles.title}>Create Secure Account</Text>
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
              <Text style={styles.notice}>Después del registro debes confirmar el email enviado por Supabase.</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.linkButton}>
                  <Text style={styles.linkText}>Already cleared? Log in</Text>
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
  logoBadge: {
    width: 56,
    height: 56,
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700"
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
    minHeight: 48
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
