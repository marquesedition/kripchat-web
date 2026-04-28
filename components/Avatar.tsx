import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "@/lib/theme";
import { formatOpsCode } from "@/lib/opsIdentity";

type Props = {
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
  online?: boolean;
};

export function Avatar({ username, avatarUrl, size = 44, online }: Props) {
  const initials = formatOpsCode(username).slice(0, 2);

  return (
    <View style={{ width: size, height: size }}>
      <LinearGradient colors={["#20242b", "#1a1d23"]} style={[styles.ring, { borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.image, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
        ) : (
          <View style={[styles.fallback, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
            <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.32) }]}>{initials}</Text>
          </View>
        )}
      </LinearGradient>
      <View style={[styles.presence, { right: 0, bottom: 0 }, online ? styles.online : styles.offline]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    backgroundColor: colors.bg2
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg2
  },
  initials: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontWeight: "800",
    letterSpacing: 0
  },
  presence: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.bg
  },
  online: {
    backgroundColor: colors.green
  },
  offline: {
    backgroundColor: colors.faint
  }
});
