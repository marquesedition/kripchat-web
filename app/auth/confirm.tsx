import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenShell } from "@/components/ScreenShell";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/lib/theme";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ConfirmAccountScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    let canceled = false;

    async function handleConfirm() {
      const error = firstParam(params.error);
      const errorDescription = firstParam(params.error_description);
      const code = firstParam(params.code);
      const tokenHash = firstParam(params.token_hash);
      const type = firstParam(params.type);

      try {
        if (error || errorDescription) {
          throw new Error(errorDescription || error || "No se pudo activar la cuenta.");
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "email_change" | "recovery" | "invite" | "magiclink" | "email"
          });
          if (verifyError) throw verifyError;
        }

        if (!canceled) {
          router.replace({
            pathname: "/(auth)/login",
            params: { confirmed: "1" }
          });
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "No se pudo activar la cuenta.";
        if (!canceled) {
          router.replace({
            pathname: "/(auth)/login",
            params: { confirm_error: message }
          });
        }
      }
    }

    handleConfirm().catch(() => undefined);

    return () => {
      canceled = true;
    };
  }, [params.code, params.error, params.error_description, params.token_hash, params.type]);

  return (
    <ScreenShell>
      <View style={styles.container}>
        <ActivityIndicator color={colors.green} />
        <Text style={styles.title}>Activando cuenta...</Text>
        <Text style={styles.subtitle}>Estamos validando tu sesión y te llevamos al login.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center"
  }
});
