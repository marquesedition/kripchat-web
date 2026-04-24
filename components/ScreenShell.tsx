import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

export function ScreenShell({ children }: PropsWithChildren) {
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
      <SafeAreaView style={styles.safe}>{children}</SafeAreaView>
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
