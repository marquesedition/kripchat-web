import { getUserFacingErrorMessage } from "@/lib/userFeedback";

describe("user feedback error mapping", () => {
  it("returns email confirmation guidance", () => {
    expect(getUserFacingErrorMessage({ code: "email_not_confirmed" })).toBe(
      "Debes confirmar tu email para continuar. Revisa tu bandeja de entrada y vuelve a intentarlo."
    );
  });

  it("maps session problems by status or message", () => {
    expect(getUserFacingErrorMessage({ status: 401, message: "Unauthorized" })).toBe(
      "Tu sesión expiró o no es válida. Vuelve a iniciar sesión."
    );
    expect(getUserFacingErrorMessage(new Error("jwt expired"))).toBe(
      "Tu sesión expiró o no es válida. Vuelve a iniciar sesión."
    );
  });

  it("maps network and permission errors", () => {
    expect(getUserFacingErrorMessage(new Error("Network request failed"))).toBe(
      "Problema de red. Revisa tu conexión e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage({ code: "42501", message: "row-level security" })).toBe(
      "No tienes permisos para esta acción con la sesión actual."
    );
  });

  it("maps channel-specific business errors", () => {
    expect(getUserFacingErrorMessage(new Error("No profile found for that username"))).toBe(
      "No encontramos ese usuario. Revisa el nombre e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage(new Error("The other user has not published an E2EE key yet"))).toBe(
      "El otro usuario todavía no completó su configuración segura. Pídele que cierre y abra sesión."
    );
    expect(getUserFacingErrorMessage(new Error("Unable to download encrypted payload"))).toBe(
      "No se pudo descargar el adjunto cifrado. Inténtalo de nuevo."
    );
  });

  it("maps throttling and empty message errors", () => {
    expect(getUserFacingErrorMessage({ status: 429, message: "Too many requests" })).toBe(
      "Hay demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo."
    );
    expect(getUserFacingErrorMessage(new Error("Message is empty"))).toBe("El mensaje está vacío.");
  });

  it("falls back to original text or custom fallback", () => {
    expect(getUserFacingErrorMessage(new Error("  custom failure  "))).toBe("custom failure");
    expect(getUserFacingErrorMessage(undefined, "Fallback")).toBe("Fallback");
  });
});
