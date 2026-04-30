type ErrorShape = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  endpoint?: unknown;
  error?: unknown;
  response?: unknown;
  data?: unknown;
};

const SUPABASE_CODE_MESSAGES: Record<string, string> = {
  anonymous_provider_disabled: "El acceso anónimo está desactivado en Supabase.",
  email_address_invalid: "El email no es válido para registro. Usa una dirección real.",
  email_address_not_authorized: "Ese email no está autorizado con el proveedor SMTP actual.",
  email_exists: "Ese email ya está registrado.",
  email_not_confirmed: "Debes confirmar tu email para continuar. Revisa tu bandeja de entrada y vuelve a intentarlo.",
  email_provider_disabled: "El registro por email está desactivado en Supabase.",
  invalid_credentials: "Usuario no existe o credenciales incorrectas. Revisa email y contraseña.",
  over_email_send_rate_limit: "Has alcanzado el límite de envío de emails. Espera unos minutos antes de volver a registrarte.",
  over_request_rate_limit: "Demasiadas solicitudes desde este dispositivo o red. Espera unos minutos e inténtalo de nuevo.",
  request_timeout: "La solicitud tardó demasiado. Inténtalo de nuevo.",
  refresh_token_already_used: "Tu sesión ya no es válida. Inicia sesión de nuevo.",
  refresh_token_not_found: "Tu sesión no existe o fue cerrada. Inicia sesión de nuevo.",
  same_password: "La nueva contraseña debe ser diferente a la actual.",
  session_expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
  session_not_found: "Tu sesión ya no existe. Vuelve a iniciar sesión.",
  signup_disabled: "El registro de nuevas cuentas está desactivado temporalmente.",
  weak_password: "La contraseña no cumple los requisitos de seguridad.",
  pgrst202: "Falta una función SQL esperada por la app en Supabase.",
  pgrst204: "Falta una columna o recurso del esquema en Supabase."
};

const TECHNICAL_MESSAGE_DENYLIST = ["invalid login credentials"];

function readStringField(source: unknown, field: keyof ErrorShape) {
  if (!source || typeof source !== "object" || !(field in source)) return "";
  const value = (source as ErrorShape)[field];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function findApiErrorShape(error: unknown): ErrorShape | null {
  if (!error || typeof error !== "object") return null;

  const directCode = readStringField(error, "code");
  const directMessage = readStringField(error, "message");
  const directDetails = readStringField(error, "details");
  const directHint = readStringField(error, "hint");
  const directStatus = readStringField(error, "status");
  const directEndpoint = readStringField(error, "endpoint");

  if (directCode || directMessage || directDetails || directHint || directStatus || directEndpoint) {
    return {
      code: directCode,
      message: directMessage,
      details: directDetails,
      hint: directHint,
      status: directStatus,
      endpoint: directEndpoint
    };
  }

  const nested = (error as ErrorShape).error ?? (error as ErrorShape).data ?? (error as ErrorShape).response;
  return findApiErrorShape(nested);
}

export function getApiErrorMessage(error: unknown) {
  const apiError = findApiErrorShape(error);
  const code = String(apiError?.code ?? "").trim();
  const message = String(apiError?.message ?? "").trim();
  const status = String(apiError?.status ?? "").trim();
  const endpoint = String(apiError?.endpoint ?? "").trim();
  if (!code && !message && !status) return "";
  const prefix = code || status ? `[${code || status}] ` : "";
  const suffix = endpoint ? `\n${endpoint}` : "";
  return `${prefix}${message || "Error de API"}${suffix}`;
}

function errorText(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  const apiError = findApiErrorShape(error);
  if (apiError?.message) return String(apiError.message);
  if (error instanceof Error) return error.message;
  return "";
}

function errorCode(error: unknown) {
  return String(findApiErrorShape(error)?.code ?? "").toLowerCase();
}

function errorStatus(error: unknown) {
  return String(findApiErrorShape(error)?.status ?? "").toLowerCase();
}

function isNetworkIssue(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout")
  );
}

function isSessionIssue(text: string, code: string) {
  const normalized = text.toLowerCase();
  return (
    code === "pgrst301" ||
    normalized.includes("jwt expired") ||
    normalized.includes("invalid jwt") ||
    normalized.includes("not authenticated") ||
    normalized.includes("auth session missing")
  );
}

function withErrorDetail(userMessage: string, rawText: string) {
  const detail = rawText.trim();
  if (!detail) return userMessage;
  if (TECHNICAL_MESSAGE_DENYLIST.includes(detail.toLowerCase())) return userMessage;
  if (userMessage.toLowerCase().includes(detail.toLowerCase())) return userMessage;
  return `${userMessage}\n\nDetalle: ${detail}`;
}

export function getUserFacingErrorMessage(error: unknown, fallback = "No se pudo completar la operación. Inténtalo de nuevo.") {
  const text = errorText(error);
  const code = errorCode(error);
  const status = errorStatus(error);
  const normalized = text.toLowerCase();

  if (code && SUPABASE_CODE_MESSAGES[code]) {
    if (code === "over_email_send_rate_limit" || code === "invalid_credentials") return SUPABASE_CODE_MESSAGES[code];
    return withErrorDetail(SUPABASE_CODE_MESSAGES[code], text);
  }

  if (normalized.includes("email rate limit exceeded")) {
    return "Has alcanzado el límite de envío de emails. Espera unos minutos antes de volver a registrarte.";
  }

  if (normalized.includes("email not confirmed")) {
    return withErrorDetail(SUPABASE_CODE_MESSAGES.email_not_confirmed, text);
  }

  if (normalized.includes("invalid login credentials")) {
    return "Usuario no existe o credenciales incorrectas. Revisa email y contraseña.";
  }

  if (isSessionIssue(text, code) || status === "401") {
    return withErrorDetail("Tu sesión expiró o no es válida. Vuelve a iniciar sesión.", text);
  }

  if (isNetworkIssue(text)) {
    return withErrorDetail("Problema de red. Revisa tu conexión e inténtalo de nuevo.", text);
  }

  if (code === "42501" || status === "403" || normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return withErrorDetail("No tienes permisos para esta acción con la sesión actual.", text);
  }

  if (code === "429" || status === "429" || normalized.includes("too many requests")) {
    return withErrorDetail("Hay demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.", text);
  }

  if (normalized.includes("peer not found") || normalized.includes("no profile found for that username")) {
    return withErrorDetail("No encontramos ese usuario. Revisa el nombre e inténtalo de nuevo.", text);
  }

  if (normalized.includes("slow down before sending another packet")) {
    return withErrorDetail("Estás enviando mensajes muy rápido. Espera unos segundos.", text);
  }

  if (normalized.includes("message is empty")) {
    return withErrorDetail("El mensaje está vacío.", text);
  }

  if (normalized.includes("the other user has not published an e2ee key yet")) {
    return withErrorDetail("El otro usuario todavía no completó su configuración segura. Pídele que cierre y abra sesión.", text);
  }

  if (normalized.includes("the other user has no registered e2ee devices yet")) {
    return withErrorDetail("El otro usuario todavía no tiene un dispositivo seguro registrado. Pídele que cierre y abra sesión.", text);
  }

  if (normalized.includes("unable to download encrypted payload")) {
    return withErrorDetail("No se pudo descargar el adjunto cifrado. Inténtalo de nuevo.", text);
  }

  const trimmed = text.trim();
  return trimmed || fallback;
}
