import { getUserFacingErrorMessage } from "@/lib/userFeedback";

describe("user feedback error mapping", () => {
  it("returns email confirmation guidance", () => {
    expect(getUserFacingErrorMessage({ code: "email_not_confirmed" })).toBe(
      "Debes confirmar tu email para continuar. Revisa tu bandeja de entrada y vuelve a intentarlo."
    );
  });

  it("maps email send rate limit errors", () => {
    expect(getUserFacingErrorMessage({ code: "over_email_send_rate_limit", message: "email rate limit exceeded" })).toBe(
      "Has alcanzado el límite de envío de emails. Espera unos minutos antes de volver a registrarte."
    );
  });

  it("maps session problems by status or message", () => {
    expect(getUserFacingErrorMessage({ status: 401, message: "Unauthorized" })).toContain(
      "Tu sesión expiró o no es válida. Vuelve a iniciar sesión."
    );
    expect(getUserFacingErrorMessage({ status: 401, message: "Unauthorized" })).toContain("Detalle: Unauthorized");
    expect(getUserFacingErrorMessage(new Error("jwt expired"))).toContain("Detalle: jwt expired");
  });

  it("maps network and permission errors", () => {
    expect(getUserFacingErrorMessage(new Error("Network request failed"))).toContain(
      "Problema de red. Revisa tu conexión e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage(new Error("Network request failed"))).toContain("Detalle: Network request failed");
    expect(getUserFacingErrorMessage({ code: "42501", message: "row-level security" })).toContain(
      "No tienes permisos para esta acción con la sesión actual."
    );
    expect(getUserFacingErrorMessage({ code: "42501", message: "row-level security" })).toContain("Detalle: row-level security");
  });

  it("maps channel-specific business errors", () => {
    expect(getUserFacingErrorMessage(new Error("No profile found for that username"))).toContain(
      "No encontramos ese usuario. Revisa el nombre e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage(new Error("The other user has not published an E2EE key yet"))).toContain(
      "El otro usuario todavía no completó su configuración segura. Pídele que cierre y abra sesión."
    );
    expect(getUserFacingErrorMessage(new Error("Unable to download encrypted payload"))).toContain(
      "No se pudo descargar el adjunto cifrado. Inténtalo de nuevo."
    );
  });

  it("maps throttling and empty message errors", () => {
    expect(getUserFacingErrorMessage({ status: 429, message: "Too many requests" })).toContain(
      "Hay demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage(new Error("Message is empty"))).toContain("El mensaje está vacío.");
  });

  it("falls back to original text or custom fallback", () => {
    expect(getUserFacingErrorMessage(new Error("  custom failure  "))).toBe("custom failure");
    expect(getUserFacingErrorMessage(undefined, "Fallback")).toBe("Fallback");
  });
});
