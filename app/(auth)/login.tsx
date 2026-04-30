import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { isEmailNotConfirmedError } from "@/features/auth/authService";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { useAuthStore } from "@/features/auth/authStore";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);
  const params = useLocalSearchParams<{ confirmed?: string; confirm_error?: string }>();
  const loading = useAuthStore((state) => state.loading);
  const signIn = useAuthStore((state) => state.signIn);

  function showLoginError(title: string, message: string) {
    setAuthError({ title, message });
    Alert.alert(title, message);
  }

  useEffect(() => {
    const confirmed = Array.isArray(params.confirmed) ? params.confirmed[0] : params.confirmed;
    const confirmError = Array.isArray(params.confirm_error) ? params.confirm_error[0] : params.confirm_error;

    if (confirmed === "1") {
      Alert.alert("Email confirmado", "Tu email fue confirmado. Ya puedes iniciar sesión.");
      router.replace("/(auth)/login");
      return;
    }

    if (confirmError) {
      Alert.alert("Error al confirmar email", confirmError);
      router.replace("/(auth)/login");
    }
  }, [params.confirm_error, params.confirmed]);

  async function onSubmit() {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      showLoginError("Supabase required", "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.");
      return;
    }
    if (!isValidEmail(email) || !password) {
      showLoginError("Invalid login", "Enter a valid email and password.");
      return;
    }
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        showLoginError("Email confirmation required", "Confirma tu email desde el mensaje de Supabase y luego inicia sesión.");
        return;
      }
      showLoginError("Error de autenticación", getUserFacingErrorMessage(error, "No se pudo iniciar sesión."));
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={26} color={colors.green} />
            </View>
            <Text style={styles.kicker}>KRIPCHAT</Text>
            <Text style={styles.title}>Secure Channel Authentication</Text>
            <Text style={styles.subtitle}>Sign in to access encrypted channels.</Text>
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
                onChangeText={(value) => {
                  setEmail(value);
                  if (authError) setAuthError(null);
                }}
                style={styles.input}
              />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="password"
                placeholderTextColor={colors.faint}
                secureTextEntry
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (authError) setAuthError(null);
                }}
                style={styles.input}
              />
            </View>
            {authError ? (
              <View style={styles.apiErrorBox}>
                <Text style={styles.apiErrorLabel}>{authError.title}</Text>
                <Text style={styles.apiErrorText}>{authError.message}</Text>
              </View>
            ) : null}
            <View style={styles.actionStack}>
              <GlassButton label={loading ? "Authenticating..." : "Enter"} disabled={loading} onPress={onSubmit} style={styles.primaryButton} />
              <Link href="/(auth)/register" asChild>
                <Pressable style={styles.linkButton}>
                  <Text style={styles.linkText}>Create Secure Account</Text>
                </Pressable>
              </Link>
            </View>
          </GlassCard>
          <Text style={styles.footerText}>E2EE PROTOCOL ACTIVE</Text>
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
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(60,255,107,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  kicker: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20
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
  apiErrorBox: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 107, 107, 0.55)",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  apiErrorLabel: {
    color: "#ff8f8f",
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6
  },
  apiErrorText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18
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
  linkText: {
    color: colors.blue,
    fontWeight: "700"
  },
  footerText: {
    color: colors.faint,
    fontFamily: fonts.mono,
    marginTop: spacing.md,
    textAlign: "center",
    fontSize: 11
  }
});
