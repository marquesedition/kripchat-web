import { PropsWithChildren } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPublicBuildLabel } from "@/lib/buildInfo";
import { colors } from "@/lib/theme";

export function ScreenShell({ children }: PropsWithChildren) {
  const showWebFooter = Platform.OS === "web";
  const versionLabel = getPublicBuildLabel();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bg, "#101319", "#0d0f13"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.vignette} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>{children}</View>
        {showWebFooter ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{versionLabel}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  safe: {
    flex: 1
  },
  content: {
    flex: 1
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: "rgba(13, 15, 19, 0.86)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center"
  },
  footerText: {
    color: colors.faint,
    fontSize: 11,
    letterSpacing: 0.3
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)"
  }
});
