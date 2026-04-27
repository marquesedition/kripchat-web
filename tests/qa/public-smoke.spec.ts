import { expect, test } from "@playwright/test";

test.describe("public web experience", () => {
  test("root redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Private chat for your team.")).toBeVisible();
  });

  test("login screen keeps the critical auth fields visible", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Private chat for your team.")).toBeVisible();
    await expect(page.getByText("Enter").first()).toBeVisible();
  });

  test("register screen exposes onboarding and email confirmation notice", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Register").first()).toBeVisible();
    await expect(page.getByText("Email verification is required before you can start chatting.")).toBeVisible();
  });

  test("protected profile route redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder("operator@email.com")).toBeVisible();
  });

  test("auth screens are cross-linked", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Need a handle? Register").click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByText("Already cleared? Log in").click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
