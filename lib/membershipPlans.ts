export const FREE_PLAN_LIMITS = {
  priceUsd: 0,
  activeConversations: 3,
  secureDevices: 1,
  history: "basic"
} as const;

export const membershipPlans = [
  {
    icon: "person-outline",
    plan: "Access",
    audience: "Free",
    price: "$0",
    cadence: "para probar",
    description: "La puerta de entrada para sentir KripChat sin compromiso.",
    bullets: ["Chats 1:1 cifrados", "3 conversaciones activas", "Historial basico", "1 dispositivo seguro"],
    cta: "Crear cuenta gratis",
    featured: false,
    note: "",
    limits: FREE_PLAN_LIMITS
  },
  {
    icon: "eye-off-outline",
    plan: "Ghost",
    audience: "Pro",
    price: "$8",
    cadence: "por mes",
    description: "Control personal completo para freelancers, hackers eticos y operadores serios.",
    bullets: ["Conversaciones ilimitadas", "Multi-device seguro", "Adjuntos cifrados grandes", "Busqueda, backup y autodestruccion"],
    cta: "Activar Ghost",
    featured: true,
    note: "$72 al ano",
    limits: null
  },
  {
    icon: "people-outline",
    plan: "Squad",
    audience: "Team",
    price: "$49",
    cadence: "por mes",
    description: "Espacios privados para squads, agencias y comunidades cerradas.",
    bullets: ["Hasta 5 miembros", "Roles owner/admin/member", "Invitaciones controladas", "Bloqueo remoto de dispositivos"],
    cta: "Crear Squad",
    featured: false,
    note: "",
    limits: null
  },
  {
    icon: "business-outline",
    plan: "Ops",
    audience: "Enterprise",
    price: "$499+",
    cadence: "por mes",
    description: "Infraestructura dedicada para organizaciones con compliance y riesgo real.",
    bullets: ["SSO/SAML", "Namespace privado", "Deploy dedicado", "SLA, API y soporte prioritario"],
    cta: "Hablar de Ops",
    featured: false,
    note: "",
    limits: null
  }
] as const;
