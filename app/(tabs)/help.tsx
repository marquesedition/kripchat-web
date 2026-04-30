import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/components/ScreenShell";
import { colors, fonts, radii, spacing } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type InfoItem = {
  icon: IconName;
  title: string;
  body: string;
};

type InfoSection = {
  eyebrow: string;
  title: string;
  summary: string;
  items: InfoItem[];
};

const infoSections: InfoSection[] = [
  {
    eyebrow: "START",
    title: "Qué es KripChat",
    summary: "KripChat es una app de chat privada por username. Supabase autentica, transporta y sincroniza, pero el contenido del mensaje viaja cifrado.",
    items: [
      {
        icon: "at-outline",
        title: "Identidad por username",
        body: "No necesitas usar un teléfono como identificador público. Tu perfil visible usa username, avatar y datos públicos mínimos."
      },
      {
        icon: "lock-closed-outline",
        title: "Mensajes cifrados",
        body: "La app cifra en el cliente. La base de datos guarda paquetes cifrados, estados y metadatos necesarios, no el texto plano."
      },
      {
        icon: "phone-portrait-outline",
        title: "Multi-dispositivo",
        body: "Cada navegador o móvil registra su propio dispositivo. Un mensaje se envía como copia cifrada para cada dispositivo destinatario."
      }
    ]
  },
  {
    eyebrow: "INBOX",
    title: "Pantalla de chats",
    summary: "Es la entrada principal: solicitudes, canales aceptados, estados de sincronización y creación de nuevos chats.",
    items: [
      {
        icon: "add-outline",
        title: "Botón +",
        body: "Abre un canal por username. Si la otra persona aún no aceptó, se crea una solicitud de inbox en vez de meter el chat directamente."
      },
      {
        icon: "sync-outline",
        title: "Botón recargar",
        body: "Fuerza la sincronización de conversaciones, solicitudes y paquetes. Realtime también actualiza la pantalla automáticamente."
      },
      {
        icon: "checkmark-outline",
        title: "Aceptar solicitud",
        body: "Convierte una solicitud pendiente en conversación visible y abre el canal para empezar a enviar mensajes."
      },
      {
        icon: "close-outline",
        title: "Rechazar solicitud",
        body: "Rechaza la solicitud y avisa al solicitante. El chat no se agrega a tu listado principal."
      },
      {
        icon: "chatbubble-ellipses-outline",
        title: "Tarjeta de chat",
        body: "Abre la conversación. El preview se calcula localmente cuando puede descifrarse; no se guarda preview en texto plano en Supabase."
      }
    ]
  },
  {
    eyebrow: "CHAT",
    title: "Dentro de una conversación",
    summary: "La pantalla de chat muestra mensajes, herramientas, estado del canal y controles de seguridad.",
    items: [
      {
        icon: "chevron-back-outline",
        title: "Volver",
        body: "Regresa al listado de chats sin cerrar sesión ni destruir el canal."
      },
      {
        icon: "shield-checkmark-outline",
        title: "Información del chat",
        body: "Abre el panel de seguridad: estado del canal, presencia, autodestrucción, modo alto riesgo y acciones críticas."
      },
      {
        icon: "add-circle-outline",
        title: "Adjuntos",
        body: "Permite preparar imagen, video, audio, documento o ubicación como payload seguro. En modo alto riesgo se bloquean adjuntos."
      },
      {
        icon: "clipboard-outline",
        title: "Pegar",
        body: "Pega texto del portapapeles si la plataforma lo permite. En modo alto riesgo se restringe para reducir exposición accidental."
      },
      {
        icon: "send-outline",
        title: "Enviar",
        body: "Cifra el texto para los dispositivos destinatarios, inserta los paquetes cifrados y muestra tu mensaje en la UI local."
      },
      {
        icon: "finger-print-outline",
        title: "Mantener pulsado un mensaje",
        body: "Abre Packet Intel con información técnica del paquete cifrado. Si el chat está en alto riesgo, esta inspección se bloquea."
      }
    ]
  },
  {
    eyebrow: "SECURITY",
    title: "Panel de seguridad",
    summary: "Aquí están las opciones sensibles del canal. Algunas afectan solo tu vista y otras modifican el estado del servidor.",
    items: [
      {
        icon: "warning-outline",
        title: "Modo alto riesgo",
        body: "Restringe acciones como copiar, adjuntar o inspeccionar paquetes cuando la plataforma lo permite."
      },
      {
        icon: "timer-outline",
        title: "Autodestrucción",
        body: "Configura una ventana de eliminación del chat. Cuando vence, la app intenta destruir el canal completo."
      },
      {
        icon: "eye-outline",
        title: "View window",
        body: "Controla cuánto tiempo se revela un mensaje en pantalla. AUTO marca lectura normal; MANUAL limita la ventana visible."
      },
      {
        icon: "copy-outline",
        title: "Copy channel id",
        body: "Copia el identificador técnico del canal. Se oculta en modo alto riesgo para evitar compartir metadatos."
      },
      {
        icon: "reload-outline",
        title: "Reload encrypted packets",
        body: "Vuelve a descargar los paquetes cifrados del canal actual y recalcula la vista local."
      },
      {
        icon: "trash-outline",
        title: "Destruir conversación para todos",
        body: "Abre una confirmación. Si aceptas, llama a la RPC de Supabase y borra conversación, participantes, mensajes y adjuntos del servidor."
      },
      {
        icon: "exit-outline",
        title: "Close channel",
        body: "Cierra la pantalla del chat y vuelve al listado. No borra datos."
      }
    ]
  },
  {
    eyebrow: "PROFILE",
    title: "Perfil y sesión",
    summary: "Tu perfil controla la identidad pública que otros usuarios ven al buscarte o chatear contigo.",
    items: [
      {
        icon: "person-circle-outline",
        title: "Callsign",
        body: "Es tu username público. Sirve para que otros usuarios te encuentren sin exponer email ni teléfono."
      },
      {
        icon: "image-outline",
        title: "Avatar URL",
        body: "Imagen pública opcional. No uses una URL que revele datos personales si buscas máxima privacidad."
      },
      {
        icon: "notifications-outline",
        title: "Notifications on",
        body: "Activa permisos del navegador para avisos mientras la app está abierta. En móvil dependerá del empaquetado nativo."
      },
      {
        icon: "save-outline",
        title: "Save profile",
        body: "Guarda cambios de username/avatar y actualiza datos públicos mínimos del perfil."
      },
      {
        icon: "log-out-outline",
        title: "Sign out",
        body: "Cierra la sesión actual. Las claves privadas del dispositivo se mantienen en almacenamiento seguro salvo limpieza explícita."
      }
    ]
  },
  {
    eyebrow: "PRIVACY",
    title: "Privacidad y límites actuales",
    summary: "KripChat minimiza contenido visible para el backend, pero aún hay metadatos inevitables para enrutar y sincronizar.",
    items: [
      {
        icon: "server-outline",
        title: "Qué ve Supabase",
        body: "IDs de usuarios, conversaciones, dispositivos, timestamps, estados de entrega/lectura si están activos y ciphertext."
      },
      {
        icon: "key-outline",
        title: "Qué no debe ver Supabase",
        body: "Texto plano de mensajes, claves privadas y archivos originales sin cifrar."
      },
      {
        icon: "construct-outline",
        title: "Cripto actual",
        body: "La capa local está preparada para sustituirse por Signal Protocol auditado antes de producción real de seguridad alta."
      },
      {
        icon: "bug-outline",
        title: "Mensajes de error",
        body: "Si una API devuelve message, la app debe mostrar ese mensaje de forma amigable sin exponer rutas internas ni detalles peligrosos."
      },
      {
        icon: "code-slash-outline",
        title: "Swagger",
        body: "La ruta /swagger documenta las llamadas usadas por la app para revisar contratos de Auth, perfiles, chats, mensajes y storage."
      }
    ]
  }
];

export default function HelpScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const itemWidth = isWide ? "48.5%" : "100%";

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.eyebrow}>KRIPCHAT INFO</Text>
              <View style={styles.statusPill}>
                <Ionicons name="shield-checkmark-outline" color={colors.green} size={13} />
                <Text style={styles.statusText}>Privacidad primero</Text>
              </View>
            </View>
            <Text style={styles.title}>Manual de uso</Text>
            <Text style={styles.subtitle}>
              Funciones, botones y límites de seguridad explicados de forma clara para usar KripChat desde el teléfono.
            </Text>
          </View>

          <View style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <Ionicons name="information-circle-outline" color={colors.green} size={19} />
              <Text style={styles.summaryTitle}>Resumen operativo</Text>
            </View>
            <Text style={styles.summaryBody}>
              Las acciones normales navegan o sincronizan. Las acciones sensibles, como destruir una conversación o cambiar privacidad, deben mostrar confirmación o estado visible.
            </Text>
            <View style={styles.summaryGrid}>
              <SummaryMetric label="Backend" value="Ciphertext" />
              <SummaryMetric label="Identidad" value="Username" />
              <SummaryMetric label="Realtime" value="Activo" />
              <SummaryMetric label="Docs API" value="/swagger" />
            </View>
          </View>

          <View style={styles.sectionStack}>
            {infoSections.map((section) => (
              <View key={section.title} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>{section.eyebrow}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSummary}>{section.summary}</Text>
                </View>
                <View style={styles.itemGrid}>
                  {section.items.map((item) => (
                    <View key={`${section.title}-${item.title}`} style={[styles.infoRow, { width: itemWidth }]}>
                      <View style={styles.rowIcon}>
                        <Ionicons name={item.icon} color={colors.green} size={19} />
                      </View>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle}>{item.title}</Text>
                        <Text style={styles.rowBody}>{item.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 104
  },
  shell: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center"
  },
  header: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 10
  },
  eyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0
  },
  statusPill: {
    minHeight: 28,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(60,255,107,0.06)"
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  summaryPanel: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(20, 23, 28, 0.86)",
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 12
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  summaryBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  metric: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.025)"
  },
  metricLabel: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: "900"
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  sectionStack: {
    gap: 26
  },
  section: {
    gap: 12
  },
  sectionHeader: {
    gap: 5,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  sectionEyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  sectionSummary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10
  },
  infoRow: {
    minHeight: 74,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.018)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60,255,107,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,255,107,0.055)",
    flexShrink: 0,
    marginTop: 1
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  rowBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  }
});
