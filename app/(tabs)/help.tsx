import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const helpSections = [
  {
    icon: "chatbubbles-outline",
    title: "Chats",
    body: "Tu listado muestra solo canales aceptados. El preview se calcula en el cliente cuando el paquete puede descifrarse."
  },
  {
    icon: "mail-unread-outline",
    title: "Solicitudes de inbox",
    body: "Cuando alguien quiere abrir un canal contigo, aparece una solicitud. Si aceptas, el chat se agrega a ambos listados. Si rechazas, el solicitante ve el rechazo."
  },
  {
    icon: "lock-closed-outline",
    title: "Cifrado",
    body: "Supabase transporta ciphertext. Los mensajes nuevos se cifran por dispositivo para que web, Android e iOS puedan descifrar su propia copia."
  },
  {
    icon: "phone-portrait-outline",
    title: "Dispositivos",
    body: "Cada navegador o teléfono registra un device propio. Si un device no existía antes, cierra y abre sesión para registrarlo."
  },
  {
    icon: "trash-outline",
    title: "Destruir conversación",
    body: "Borra el canal para todas las cuentas: conversación, participantes, mensajes, paquetes cifrados y adjuntos del servidor."
  },
  {
    icon: "shield-checkmark-outline",
    title: "Modo alto riesgo",
    body: "Restringe capturas, portapapeles y adjuntos donde la plataforma lo permite. Úsalo para conversaciones sensibles."
  },
  {
    icon: "timer-outline",
    title: "Autodestrucción",
    body: "Programa la eliminación del canal completo. Cuando vence, la conversación se elimina del servidor."
  },
  {
    icon: "attach-outline",
    title: "Adjuntos",
    body: "Los archivos se suben como blobs cifrados. Nunca debe subirse el archivo original sin cifrar."
  },
  {
    icon: "code-slash-outline",
    title: "Swagger API",
    body: "La ruta /swagger documenta las llamadas de Supabase usadas por la app para revisar endpoints y contratos."
  }
] as const;

export default function HelpScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>KRIPCHAT HELP</Text>
          <Text style={styles.title}>Ayuda</Text>
          <Text style={styles.subtitle}>Guía rápida de las funciones principales y lo que ocurre con tus datos.</Text>
        </View>

        <View style={styles.stack}>
          {helpSections.map((section) => (
            <GlassCard key={section.title} style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name={section.icon} color={colors.green} size={20} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardBody}>{section.body}</Text>
              </View>
            </GlassCard>
          ))}
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
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  stack: {
    gap: 10
  },
  card: {
    minHeight: 92,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,255,107,0.08)"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: "900"
  },
  cardBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  }
});
