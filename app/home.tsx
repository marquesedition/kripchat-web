import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { membershipPlans } from "@/lib/membershipPlans";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const featureRows = [
  {
    icon: "lock-closed-outline",
    title: "Canales privados",
    body: "Conversaciones 1:1 cifradas para coordinar sin exponer identidad, telefono ni email."
  },
  {
    icon: "radio-outline",
    title: "Tiempo real",
    body: "Mensajes, presencia y escritura sincronizados con Supabase Realtime para equipos que necesitan velocidad."
  },
  {
    icon: "shield-checkmark-outline",
    title: "Operativa segura",
    body: "Handles publicos, anti-spam, control de dispositivos y base preparada para equipos que viven en canales sensibles."
  }
] as const;

const signalRows = ["Auth por hacker_handle", "Perfiles con username", "Adjuntos cifrables", "Push notifications"];

const operatorRows = [
  "Free demuestra confianza.",
  "Ghost monetiza al individuo.",
  "Squad monetiza coordinacion.",
  "Ops monetiza reduccion de riesgo."
] as const;

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
            <Text style={styles.kicker}>PRIVATE CHANNELS FOR SERIOUS OPERATORS</Text>
            <Text style={styles.title}>KripChat</Text>
            <Text style={styles.subtitle}>
              Infraestructura privada de comunicacion para equipos tecnicos, hackers eticos y operaciones que necesitan coordinar sin perder control.
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
                <Text style={styles.statusValue}>Ghost</Text>
                <Text style={styles.statusLabel}>pro mode</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>Squad</Text>
                <Text style={styles.statusLabel}>team spaces</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusValue}>Ops</Text>
                <Text style={styles.statusLabel}>dedicated infra</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionKicker}>MEMBRESIAS</Text>
          <Text style={styles.sectionTitle}>Tarifas pensadas para crecer desde un operador hasta una unidad completa</Text>
          <View style={[styles.pricingGrid, isWide && styles.pricingGridWide]}>
            {membershipPlans.map((tier) => (
              <GlassCard key={tier.plan} style={[styles.pricingCard, tier.featured && styles.featuredPricingCard]}>
                {tier.featured ? (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMENDADO</Text>
                  </View>
                ) : null}
                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, tier.featured && styles.featuredPlanIcon]}>
                    <Ionicons name={tier.icon} size={20} color={tier.featured ? colors.bg : colors.green} />
                  </View>
                  <View style={styles.planTitleBlock}>
                    <Text style={styles.planAudience}>{tier.audience}</Text>
                    <Text style={styles.planName}>{tier.plan}</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{tier.price}</Text>
                  <Text style={styles.cadence}>{tier.cadence}</Text>
                </View>
                {tier.note ? <Text style={styles.planNote}>{tier.note}</Text> : null}
                <Text style={styles.planDescription}>{tier.description}</Text>
                <View style={styles.bulletStack}>
                  {tier.bullets.map((bullet) => (
                    <View key={bullet} style={styles.planBullet}>
                      <Ionicons name="checkmark-circle" size={15} color={tier.featured ? colors.green : colors.blue} />
                      <Text style={styles.planBulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
                <GlassButton
                  label={tier.cta}
                  variant={tier.featured ? "primary" : "secondary"}
                  onPress={goToPrimaryRoute}
                  style={styles.planCta}
                />
              </GlassCard>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.opsSection]}>
          <View style={[styles.operatorBand, isWide && styles.operatorBandWide]}>
            <View style={styles.operatorCopy}>
              <Text style={styles.sectionKicker}>VISION COMERCIAL</Text>
              <Text style={styles.operatorTitle}>No vendemos otro chat. Vendemos confianza operacional.</Text>
              <Text style={styles.operatorBody}>
                KripChat debe ser el lugar donde una identidad por hacker_handle, un dispositivo autorizado y un canal privado valen mas que una bandeja de entrada llena de ruido.
              </Text>
            </View>
            <View style={styles.operatorList}>
              {operatorRows.map((row) => (
                <View key={row} style={styles.operatorRow}>
                  <Ionicons name="flash-outline" size={16} color={colors.green} />
                  <Text style={styles.operatorRowText}>{row}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footerNotice}>
          <Text style={styles.footerNoticeTitle}>APP EN DESARROLLO ACTIVO</Text>
          <Text style={styles.footerNoticeBody}>
            KripChat esta evolucionando hacia una plataforma privada de comunicacion segura. Algunas funciones, tarifas y protocolos pueden cambiar antes de la version final de produccion.
          </Text>
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
    paddingTop: spacing.xl
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
  },
  pricingGrid: {
    gap: spacing.md
  },
  pricingGridWide: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  pricingCard: {
    flex: 1,
    padding: spacing.md,
    gap: 0,
    position: "relative"
  },
  featuredPricingCard: {
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(60,255,107,0.06)"
  },
  recommendedBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.sm,
    backgroundColor: colors.green,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: spacing.md
  },
  recommendedText: {
    color: colors.bg,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,255,107,0.08)"
  },
  featuredPlanIcon: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  planTitleBlock: {
    flex: 1
  },
  planAudience: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4
  },
  planName: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 21,
    fontWeight: "900"
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: spacing.lg
  },
  price: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900"
  },
  cadence: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 6
  },
  planNote: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4
  },
  planDescription: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.md,
    minHeight: 64
  },
  bulletStack: {
    gap: 10,
    marginTop: spacing.md
  },
  planBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  planBulletText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
    fontSize: 13,
    fontWeight: "700"
  },
  planCta: {
    marginTop: spacing.lg,
    minHeight: 48
  },
  opsSection: {
    paddingBottom: spacing.xl
  },
  operatorBand: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(77,171,247,0.07)",
    padding: spacing.md,
    gap: spacing.lg
  },
  operatorBandWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  operatorCopy: {
    flex: 1,
    maxWidth: 620
  },
  operatorTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    marginBottom: 12
  },
  operatorBody: {
    color: colors.muted,
    lineHeight: 23,
    fontSize: 15
  },
  operatorList: {
    flex: 1,
    gap: 10
  },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.green,
    paddingLeft: 12,
    minHeight: 34
  },
  operatorRowText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "800",
    flex: 1
  },
  footerNotice: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 8
  },
  footerNoticeTitle: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  footerNoticeBody: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    maxWidth: 820
  }
});
