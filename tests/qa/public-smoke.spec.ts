import { expect, test } from "@playwright/test";

test.describe("public web experience", () => {
  test("landing communicates status, ownership, and entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("KripChat es un proyecto propietario de Marques Edition y sigue en desarrollo.")).toBeVisible();
    await expect(page.getByText("Copyright © Marques Edition. Todos los derechos reservados.")).toBeVisible();
    await expect(page.getByText("Iniciar sesion").first()).toBeVisible();
  });

  test("login screen keeps the critical auth fields visible", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Secure comms for fast teams.")).toBeVisible();
    await expect(page.getByText("Enter").first()).toBeVisible();
  });

  test("register screen exposes onboarding fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Register").first()).toBeVisible();
  });

  test("preview routes render the key product surfaces", async ({ page }) => {
    await page.goto("/preview/inbox");
    await expect(page.getByText(/Contacts \[\d+\]/i)).toBeVisible();
    await expect(page.getByText(/MI-\d{3}/i)).toBeVisible();

    await page.goto("/preview/thread");
    await expect(page.getByText(/SECURE CHANNEL/i).first()).toBeVisible();

    await page.goto("/preview/profile");
    await expect(page.getByText(/^Profile$/i)).toBeVisible();
  });
});
