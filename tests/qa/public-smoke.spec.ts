import { expect, test } from "@playwright/test";

test.describe("public web experience", () => {
  test("root redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Sign in to access encrypted channels.")).toBeVisible();
  });

  test("login screen keeps the critical auth fields visible", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Sign in to access encrypted channels.")).toBeVisible();
    await expect(page.getByText("Enter").first()).toBeVisible();
  });

  test("login blocks auth when Supabase environment is missing", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("hacker_handle").fill("aa");
    await page.getByText("Enter").first().click();

    await expect(page.getByText("Supabase required")).toBeVisible();
    await expect(page.getByText("Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login normalizes hacker handles as users type", async ({ page }) => {
    await page.goto("/login");

    const handle = page.getByPlaceholder("hacker_handle");
    await handle.fill("Bad Handle!!_01");

    await expect(handle).toHaveValue("badhandle_01");
  });

  test("home landing page presents the public product story", async ({ page }) => {
    await page.goto("/home");

    await expect(page.getByText("KripChat").first()).toBeVisible();
    await expect(page.getByText("FUNCIONALIDADES")).toBeVisible();
    await expect(page.getByText("Canales privados")).toBeVisible();
    await expect(page.getByText("Crear cuenta segura")).toBeVisible();
  });

  test("home page exposes membership and primary navigation CTAs", async ({ page }) => {
    await page.goto("/home");

    await expect(page.getByText("MEMBRESIAS")).toBeVisible();
    await expect(page.getByText("$0")).toBeVisible();
    await expect(page.getByRole("button", { name: "Activar Ghost" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear Squad" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hablar de Ops" })).toBeVisible();

    await page.getByText("Login").click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/home");
    await page.getByText("Register").first().click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("register screen exposes handle-only onboarding", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    await expect(page.getByPlaceholder("password")).toBeVisible();
    await expect(page.getByText("Register").first()).toBeVisible();
    await expect(page.getByText("Usa solo tu hacker_handle y password para entrar.")).toBeVisible();
  });

  test("register normalizes handles and keeps invalid submissions on the form", async ({ page }) => {
    await page.goto("/register");

    const handle = page.getByPlaceholder("hacker_handle");
    await handle.fill(" New Operative!! ");
    await expect(handle).toHaveValue("newoperative");

    await page.getByPlaceholder("password").fill("short");
    await page.getByText("Register").first().click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Create Secure Account")).toBeVisible();
  });

  test("protected profile route redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
  });

  test("protected app routes redirect unauthenticated users to login", async ({ page }) => {
    for (const path of ["/help", "/chat/00000000-0000-4000-8000-000000000001"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByPlaceholder("hacker_handle")).toBeVisible();
    }
  });

  test("auth screens are cross-linked", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Create Secure Account").click();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByText("Already cleared? Log in").click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("Swagger shell and OpenAPI contract are available", async ({ page, request }) => {
    await page.route("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css", (route) =>
      route.fulfill({ contentType: "text/css", body: "body{font-family:sans-serif}" })
    );
    await page.route("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
          window.SwaggerUIBundle = function(config) {
            document.querySelector(config.dom_id).textContent = "Swagger UI loaded " + config.url;
          };
        `
      })
    );

    await page.goto("/swagger");

    await expect(page.getByText("API Swagger")).toBeVisible();
    await expect(page.getByRole("link", { name: "openapi.yaml" })).toBeVisible();
    await expect(page.getByText("Swagger UI loaded /openapi.yaml")).toBeVisible();

    const openApi = await request.get("/openapi.yaml");
    expect(openApi.ok()).toBeTruthy();
    const body = await openApi.text();
    expect(body).toContain("KripChat Client API Surface");
    expect(body).toContain("/rest/v1/encrypted_messages");
    expect(body).toContain("x-supabase-realtime");
  });

  test("public database data-flow document is published without secrets", async ({ request }) => {
    const response = await request.get("/database-data-flow.md");
    expect(response.ok()).toBeTruthy();

    const body = await response.text();
    expect(body).toContain("KripChat database data flow");
    expect(body).toContain("Use cases and how they appear in the database");
    expect(body).toContain("encrypted_messages");
    expect(body).not.toContain("service_role");
    expect(body).not.toContain("SUPABASE_DB_URL=");
  });
});
