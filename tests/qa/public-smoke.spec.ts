import { expect, test } from "@playwright/test";

test.describe("public web experience", () => {
  test("root redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Sign in to access encrypted channels.")).toBeVisible();
  });

  test("login screen keeps the critical auth fields visible", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Sign in to access encrypted channels.")).toBeVisible();
    await expect(page.getByText("Enter").first()).toBeVisible();
  });

  test("home landing page presents the public product story", async ({ page }) => {
    await page.goto("/home");

    await expect(page.getByText("KripChat").first()).toBeVisible();
    await expect(page.getByText("FUNCIONALIDADES")).toBeVisible();
    await expect(page.getByText("Canales privados")).toBeVisible();
    await expect(page.getByText("Crear cuenta segura")).toBeVisible();
  });

  test("register screen exposes onboarding and email confirmation notice", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Register").first()).toBeVisible();
    await expect(page.getByText("Después del registro debes confirmar el email enviado por Supabase.")).toBeVisible();
  });

  test("protected profile route redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
  });

  test("auth screens are cross-linked", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Create Secure Account").click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByText("Already cleared? Log in").click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
