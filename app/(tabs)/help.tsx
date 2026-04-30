import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
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
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>KRIPCHAT INFO</Text>
            <Text style={styles.title}>Información</Text>
            <Text style={styles.subtitle}>
              Guía de funciones, botones, privacidad y comportamiento de la app para usar KripChat desde el teléfono sin tener que adivinar nada.
            </Text>
          </View>

          <GlassCard style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <Ionicons name="information-circle-outline" color={colors.bg} size={22} />
            </View>
            <View style={styles.quickCopy}>
              <Text style={styles.quickTitle}>Regla principal</Text>
              <Text style={styles.quickBody}>Si una acción puede borrar datos o cambiar privacidad, KripChat debe pedir confirmación o mostrar un estado claro.</Text>
            </View>
          </GlassCard>

          <View style={styles.sectionStack}>
            {infoSections.map((section) => (
              <View key={section.title} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>{section.eyebrow}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSummary}>{section.summary}</Text>
                </View>
                <View style={styles.cardStack}>
                  {section.items.map((item) => (
                    <GlassCard key={`${section.title}-${item.title}`} style={styles.card}>
                      <View style={styles.iconBox}>
                        <Ionicons name={item.icon} color={colors.green} size={19} />
                      </View>
                      <View style={styles.copy}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardBody}>{item.body}</Text>
                      </View>
                    </GlassCard>
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
    fontWeight: "900",
    letterSpacing: 0
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  },
  quickCard: {
    minHeight: 94,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.lg,
    borderColor: colors.borderStrong
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green
  },
  quickCopy: {
    flex: 1,
    minWidth: 0
  },
  quickTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: "900"
  },
  quickBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  },
  sectionStack: {
    gap: spacing.lg
  },
  section: {
    gap: 10
  },
  sectionHeader: {
    gap: 6
  },
  sectionEyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  sectionSummary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  cardStack: {
    gap: 9
  },
  card: {
    minHeight: 88,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  iconBox: {
    width: 40,
    height: 40,
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
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0
  },
  cardBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  }
});
