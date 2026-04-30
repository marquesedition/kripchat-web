import { useEffect, useRef } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/components/ScreenShell";
import { colors, fonts, spacing } from "@/lib/theme";

declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => void;
  }
}

const SWAGGER_UI_CSS = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
const SWAGGER_UI_BUNDLE = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
const SWAGGER_HOME = "https://swagger.io/";

export default function SwaggerScreen() {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || mountedRef.current) return;
    mountedRef.current = true;

    ensureSwaggerAssets()
      .then(() => {
        window.SwaggerUIBundle?.({
          dom_id: "#swagger-ui",
          url: "/openapi.yaml",
          deepLinking: true,
          persistAuthorization: false,
          displayRequestDuration: true,
          defaultModelsExpandDepth: 1
        });
      })
      .catch(() => {
        const root = document.getElementById("swagger-ui");
        if (root) root.textContent = "No se pudo cargar Swagger UI.";
      });
  }, []);

  if (Platform.OS !== "web") {
    return (
      <ScreenShell>
        <View style={styles.nativeWrap}>
          <Text style={styles.nativeTitle}>Swagger disponible en web</Text>
          <Text style={styles.nativeCopy}>Abre /swagger desde el navegador para ver la documentación OpenAPI.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <View style={styles.webRoot}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/home")} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text style={styles.backText}>KripChat</Text>
        </Pressable>
        <Text style={styles.title}>API Swagger</Text>
        <View style={styles.linkGroup}>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SWAGGER_HOME)}>
            <Text style={styles.swaggerLink}>swagger.io</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL("/openapi.yaml")}>
            <Text style={styles.yamlLink}>openapi.yaml</Text>
          </Pressable>
        </View>
      </View>
      <View nativeID="swagger-ui" style={styles.swaggerContainer} />
    </View>
  );
}

function ensureSwaggerAssets() {
  return Promise.all([loadStylesheet(SWAGGER_UI_CSS), loadScript(SWAGGER_UI_BUNDLE)]);
}

function loadStylesheet(href: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Unable to load ${href}`));
    document.head.appendChild(link);
  });
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.SwaggerUIBundle) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(script);
  });
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: "#f7f8fb"
  },
  topBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15, 23, 42, 0.16)",
    backgroundColor: "#0d0f13"
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 120
  },
  backText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "800",
    fontSize: 13
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 15
  },
  linkGroup: {
    minWidth: 120,
    alignItems: "flex-end",
    gap: 2
  },
  swaggerLink: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "700"
  },
  yamlLink: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right"
  },
  swaggerContainer: {
    flex: 1
  },
  nativeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  nativeTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10
  },
  nativeCopy: {
    color: colors.muted,
    fontFamily: fonts.mono,
    textAlign: "center",
    lineHeight: 20
  }
});
