type ErrorShape = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
};

function errorText(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as ErrorShape).message ?? "");
  return "";
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as ErrorShape).code ?? "").toLowerCase();
}

function errorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return "";
  return String((error as ErrorShape).status ?? "").toLowerCase();
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

export function getUserFacingErrorMessage(error: unknown, fallback = "No se pudo completar la operación. Inténtalo de nuevo.") {
  const text = errorText(error);
  const code = errorCode(error);
  const status = errorStatus(error);
  const normalized = text.toLowerCase();

  if (code === "email_not_confirmed" || normalized.includes("email not confirmed")) {
    return "Debes confirmar tu email para continuar. Revisa tu bandeja de entrada y vuelve a intentarlo.";
  }

  if (isSessionIssue(text, code) || status === "401") {
    return "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.";
  }

  if (isNetworkIssue(text)) {
    return "Problema de red. Revisa tu conexión e inténtalo de nuevo.";
  }

  if (code === "42501" || status === "403" || normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "No tienes permisos para esta acción con la sesión actual.";
  }

  if (code === "429" || status === "429" || normalized.includes("too many requests")) {
    return "Hay demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo.";
  }

  if (normalized.includes("no profile found for that username")) {
    return "No encontramos ese usuario. Revisa el nombre e inténtalo de nuevo.";
  }

  if (normalized.includes("slow down before sending another packet")) {
    return "Estás enviando mensajes muy rápido. Espera unos segundos.";
  }

  if (normalized.includes("message is empty")) {
    return "El mensaje está vacío.";
  }

  if (normalized.includes("the other user has not published an e2ee key yet")) {
    return "El otro usuario todavía no completó su configuración segura. Pídele que cierre y abra sesión.";
  }

  if (normalized.includes("unable to download encrypted payload")) {
    return "No se pudo descargar el adjunto cifrado. Inténtalo de nuevo.";
  }

  const trimmed = text.trim();
  return trimmed || fallback;
}
