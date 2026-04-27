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
        colors={[colors.bg, "#0b1718", "#071112", "#020607"]}
        locations={[0, 0.42, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.vignette} />
      <View style={[styles.scanLine, styles.scanTop]} />
      <View style={[styles.scanLine, styles.scanBottom]} />
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
    borderTopColor: "rgba(156, 194, 178, 0.18)",
    backgroundColor: "rgba(0, 0, 0, 0.24)",
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
    borderColor: "rgba(190, 225, 205, 0.05)"
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.green,
    opacity: 0.14
  },
  scanTop: {
    top: 78
  },
  scanBottom: {
    bottom: 90,
    opacity: 0.08
  }
});
