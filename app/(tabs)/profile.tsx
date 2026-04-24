import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { normalizeUsername } from "@/lib/validation";
import { registerForPushNotifications } from "@/services/notifications";

export default function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

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
      Alert.alert("Update failed", error instanceof Error ? error.message : "Unable to update profile.");
    }
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>OPERATOR IDENTITY</Text>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage the callsign and public avatar used inside secure channels.</Text>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.identityBlock}>
              <Avatar username={username} avatarUrl={avatarUrl} size={82} online />
              <View style={styles.avatarText}>
                <Text style={styles.handle}>@{profile?.username ?? "operator"}</Text>
                <Text style={styles.meta}>REALTIME PRESENCE: ACTIVE</Text>
                <Text style={styles.metaMuted}>Public profile data only. Message content remains in channel protocol.</Text>
              </View>
            </View>

            <View style={styles.form}>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl
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
    fontSize: 34,
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
    padding: spacing.lg,
    gap: spacing.md
  },
  identityBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
    fontSize: 22,
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
    gap: 12
  },
  fieldGroup: {
    gap: 7
  },
  label: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  input: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 14,
    fontSize: 15
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  primaryAction: {
    width: 190
  },
  secondaryAction: {
    width: 150
  }
});
