import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { normalizeUsername } from "@/lib/validation";
import { getBrowserNotificationPermission, registerForPushNotifications, requestBrowserNotificationPermission } from "@/services/notifications";
import { getPreferredCryptoStack, setPreferredCryptoStack, type KripChatCryptoStack } from "@/src/lib/shield";

export default function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [cryptoStack, setCryptoStack] = useState<KripChatCryptoStack>("legacy-device-envelope-v1");
  const presenceLabel = profile?.online_at ? "PRESENCE SYNCED" : "PRESENCE STANDBY";
  const browserNotificationPermission = Platform.OS === "web" ? getBrowserNotificationPermission() : "unsupported";
  const shieldSelected = cryptoStack === "kripchat-shield-v1";

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  useEffect(() => {
    let mounted = true;
    getPreferredCryptoStack()
      .then((stack) => {
        if (mounted) setCryptoStack(stack);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    if (!profile) return;
    try {
      const pushToken = await registerForPushNotifications();
      await saveProfile({
        username: normalizeUsername(username),
        avatar_url: avatarUrl.trim() || null,
        push_token: pushToken ?? profile.push_token
      });
      Alert.alert("Profile secured", "Your identity card is updated.");
    } catch (error) {
      Alert.alert("Update failed", getUserFacingErrorMessage(error, "Unable to update profile."));
    }
  }

  async function enableWebNotifications() {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") {
      Alert.alert("Notificaciones activadas", "Este navegador puede mostrar avisos mientras KripChat este abierto.");
      return;
    }

    if (permission === "denied") {
      Alert.alert("Permiso bloqueado", "Activa las notificaciones desde la configuracion del navegador para este sitio.");
      return;
    }

    Alert.alert("No disponible", "Este navegador no soporta notificaciones web en este modo.");
  }

  async function changeCryptoStack(useShield: boolean) {
    const nextStack: KripChatCryptoStack = useShield ? "kripchat-shield-v1" : "legacy-device-envelope-v1";
    await setPreferredCryptoStack(nextStack);
    setCryptoStack(nextStack);

    if (useShield) {
      Alert.alert(
        "Shield seleccionado",
        "KripChat Shield queda seleccionado para este dispositivo, pero el proveedor de cifrado final aun no esta activo. Los envios Shield fallaran cerrados hasta completar esa integracion."
      );
      return;
    }

    Alert.alert("Classic seleccionado", "Este dispositivo vuelve al cifrado actual device-envelope-v1.");
  }

  return (
    <ScreenShell>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>OPERATOR IDENTITY</Text>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage the callsign and public avatar used inside secure channels.</Text>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.identityBlock}>
              <Avatar username={username} avatarUrl={avatarUrl} size={66} online />
              <View style={styles.avatarText}>
                <Text style={styles.handle}>@{profile?.username ?? "operator"}</Text>
                <Text style={styles.meta}>{presenceLabel}</Text>
                <Text style={styles.metaMuted}>Public profile data only. Message content remains in channel protocol.</Text>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.cryptoPanel}>
                <View style={styles.cryptoCopy}>
                  <Text style={styles.label}>ENCRYPTION MODE</Text>
                  <Text style={styles.cryptoTitle}>{shieldSelected ? "KripChat Shield" : "Classic device envelope"}</Text>
                  <Text style={styles.cryptoBody}>
                    {shieldSelected
                      ? "Hybrid Shield mode is selected for this device. It stays blocked until the production provider is registered."
                      : "Current stable encryption. One ciphertext envelope per recipient device."}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Toggle KripChat Shield encryption"
                  value={shieldSelected}
                  onValueChange={changeCryptoStack}
                  trackColor={{ false: "rgba(216,232,198,0.18)", true: "rgba(60,255,107,0.45)" }}
                  thumbColor={shieldSelected ? colors.green : colors.muted}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CALLSIGN</Text>
                <TextInput
                  autoCapitalize="none"
                  placeholder="username"
                  placeholderTextColor={colors.faint}
                  value={username}
                  onChangeText={(value) => setUsername(normalizeUsername(value))}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>AVATAR URL</Text>
                <TextInput
                  autoCapitalize="none"
                  placeholder="https://..."
                  placeholderTextColor={colors.faint}
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <GlassButton label="Sign out" variant="danger" onPress={signOut} style={styles.secondaryAction} />
              {Platform.OS === "web" ? (
                <GlassButton
                  label={browserNotificationPermission === "granted" ? "Notifications on" : "Enable notifications"}
                  onPress={enableWebNotifications}
                  style={styles.primaryAction}
                  variant={browserNotificationPermission === "granted" ? "secondary" : "primary"}
                />
              ) : null}
              <GlassButton label="Save profile" onPress={save} style={styles.primaryAction} />
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 96
  },
  shell: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center"
  },
  header: {
    marginBottom: spacing.md
  },
  eyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    maxWidth: 520,
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8
  },
  card: {
    padding: spacing.md,
    gap: spacing.md
  },
  identityBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  avatarText: {
    flex: 1
  },
  handle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  meta: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5
  },
  metaMuted: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8
  },
  form: {
    gap: 18
  },
  cryptoPanel: {
    minHeight: 108,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(60,255,107,0.045)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  cryptoCopy: {
    flex: 1
  },
  cryptoTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8
  },
  cryptoBody: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8
  },
  fieldGroup: {
    gap: 12
  },
  label: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15
  },
  actions: {
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  primaryAction: {
    width: "100%"
  },
  secondaryAction: {
    width: "100%"
  }
});
