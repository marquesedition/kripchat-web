import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const featureRows = [
  {
    icon: "lock-closed-outline",
    title: "Canales privados",
    body: "Conversaciones 1:1 con sesiones persistentes, reglas RLS y frontera preparada para cifrado E2EE."
  },
  {
    icon: "radio-outline",
    title: "Tiempo real",
    body: "Mensajes, presencia y escritura sincronizados con Supabase Realtime para equipos que necesitan velocidad."
  },
  {
    icon: "shield-checkmark-outline",
    title: "Operativa segura",
    body: "Validacion de entradas, anti-spam y perfiles con clave publica para evolucionar hacia cifrado cliente a cliente."
  }
] as const;

const signalRows = ["Auth por hacker_handle", "Perfiles con username", "Adjuntos cifrables", "Push notifications"];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const session = useAuthStore((state) => state.session);
  const isWide = width >= 900;

  function goToPrimaryRoute() {
    router.push(session ? "/(tabs)" : "/(auth)/register");
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.nav}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/home")} style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="shield-checkmark" size={18} color={colors.green} />
            </View>
            <Text style={styles.brandText}>KRIPCHAT</Text>
          </Pressable>
          <View style={styles.navActions}>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="button" style={styles.navLink}>
                <Text style={styles.navLinkText}>Login</Text>
              </Pressable>
            </Link>
            <GlassButton
              label={session ? "Open app" : "Register"}
              onPress={goToPrimaryRoute}
              style={styles.navButton}
            />
          </View>
        </View>

        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
            <Text style={styles.kicker}>SECURE TEAM MESSAGING</Text>
            <Text style={styles.title}>KripChat</Text>
            <Text style={styles.subtitle}>
              Chat privado en tiempo real para equipos tecnicos, hackers eticos y operaciones que necesitan comunicarse sin perder control.
            </Text>
            <View style={styles.heroActions}>
              <GlassButton label={session ? "Entrar a chats" : "Crear cuenta segura"} onPress={goToPrimaryRoute} style={styles.primaryCta} />
              <Link href="/(auth)/login" asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryCta}>
                  <Text style={styles.secondaryCtaText}>Ya tengo acceso</Text>
                </Pressable>
              </Link>
            </View>
            <View style={styles.statusStrip}>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>E2EE</Text>
                <Text style={styles.statusLabel}>ready boundary</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>1:1</Text>
                <Text style={styles.statusLabel}>direct channels</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>RLS</Text>
                <Text style={styles.statusLabel}>data policies</Text>
              </View>
            </View>
          </View>

          <View style={[styles.heroVisual, isWide && styles.heroVisualWide]}>
            <GlassCard style={styles.devicePanel}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceDot} />
                <Text style={styles.deviceHeaderText}>encrypted-channel://active</Text>
              </View>
              <View style={styles.messageStack}>
                <View style={styles.incomingMessage}>
                  <Text style={styles.messageLabel}>BLUE_TEAM</Text>
                  <Text style={styles.messageText}>Perimeter scan clean. Rotating payload keys now.</Text>
                </View>
                <View style={styles.outgoingMessage}>
                  <Text style={styles.outgoingLabel}>YOU</Text>
                  <Text style={styles.outgoingText}>Copy. Hold channel open for live presence.</Text>
                </View>
                <View style={styles.signalPanel}>
                  {signalRows.map((item) => (
                    <View key={item} style={styles.signalRow}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                      <Text style={styles.signalText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionKicker}>FUNCIONALIDADES</Text>
          <Text style={styles.sectionTitle}>Lo esencial para operar con confianza</Text>
          <View style={[styles.featureGrid, isWide && styles.featureGridWide]}>
            {featureRows.map((feature) => (
              <GlassCard key={feature.title} style={[styles.featureCard, isWide && styles.featureCardWide]}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={21} color={colors.green} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </GlassCard>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl
  },
  nav: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,255,107,0.08)"
  },
  brandText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 14
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  navLink: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  navLinkText: {
    color: colors.muted,
    fontWeight: "800"
  },
  navButton: {
    minHeight: 42,
    minWidth: 104
  },
  hero: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg
  },
  heroWide: {
    minHeight: 590,
    flexDirection: "row",
    alignItems: "center"
  },
  heroCopy: {
    flex: 1
  },
  heroCopyWide: {
    maxWidth: 590
  },
  kicker: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 620
  },
  heroActions: {
    alignItems: "stretch",
    gap: 12,
    marginTop: spacing.lg
  },
  primaryCta: {
    width: "100%"
  },
  secondaryCta: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(77,171,247,0.08)"
  },
  secondaryCtaText: {
    color: colors.blue,
    fontWeight: "800"
  },
  statusStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.xl
  },
  statusItem: {
    minWidth: 132,
    borderLeftWidth: 2,
    borderLeftColor: colors.green,
    paddingLeft: 12,
    paddingVertical: 4
  },
  statusValue: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 18
  },
  statusLabel: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 4
  },
  heroVisual: {
    flex: 1,
    minHeight: 320
  },
  heroVisualWide: {
    maxWidth: 480
  },
  devicePanel: {
    minHeight: 320,
    padding: spacing.md
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  deviceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green
  },
  deviceHeaderText: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "800"
  },
  messageStack: {
    gap: 14,
    paddingTop: spacing.lg
  },
  incomingMessage: {
    width: "88%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(77,171,247,0.08)",
    padding: spacing.md
  },
  outgoingMessage: {
    width: "88%",
    alignSelf: "flex-end",
    borderRadius: radii.md,
    backgroundColor: colors.green,
    padding: spacing.md
  },
  messageLabel: {
    color: colors.blue,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6
  },
  outgoingLabel: {
    color: colors.bg,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6
  },
  messageText: {
    color: colors.text,
    lineHeight: 20
  },
  outgoingText: {
    color: colors.bg,
    lineHeight: 20,
    fontWeight: "700"
  },
  signalPanel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(13,15,19,0.62)",
    padding: spacing.md,
    gap: 10
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  signalText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "800"
  },
  section: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingTop: spacing.lg
  },
  sectionKicker: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    marginBottom: spacing.lg
  },
  featureGrid: {
    gap: spacing.md
  },
  featureGridWide: {
    flexDirection: "row"
  },
  featureCard: {
    padding: spacing.md
  },
  featureCardWide: {
    flex: 1
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,255,107,0.08)",
    marginBottom: spacing.md
  },
  featureTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  featureBody: {
    color: colors.muted,
    lineHeight: 22
  }
});
