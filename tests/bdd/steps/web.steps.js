const { Given, Then, When } = require("@cucumber/cucumber");
const { expect } = require("@playwright/test");

const splitDocString = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const tableValues = (table) => table.raw().flat().map((value) => value.trim()).filter(Boolean);

Given("que abro la ruta {string}", async function (path) {
  await this.page.goto(path);
});

Given("que los assets externos de Swagger estan simulados", async function () {
  await this.page.route("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css", (route) =>
    route.fulfill({ contentType: "text/css", body: "body{font-family:sans-serif}" })
  );
  await this.page.route("https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        window.SwaggerUIBundle = function(config) {
          document.querySelector(config.dom_id).textContent = "Swagger UI loaded " + config.url;
        };
      `
    })
  );
});

When("escribo {string} en el campo {string}", async function (value, placeholder) {
  await this.page.getByPlaceholder(placeholder).fill(value);
});

When("pulso el texto {string}", async function (text) {
  await this.page.getByText(text).first().click();
});

When("pulso el boton {string}", async function (name) {
  await this.page.getByRole("button", { name }).click();
});

When("hago una peticion GET a {string}", async function (path) {
  this.lastResponse = await this.api.get(path);
  this.lastResponseBody = await this.lastResponse.text();
});

Then("debo estar en la ruta {string}", async function (path) {
  await expect(this.page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
});

Then("debo ver el texto {string}", async function (text) {
  await expect(this.page.getByText(text).first()).toBeVisible();
});

Then("debo ver estos textos:", async function (table) {
  for (const text of tableValues(table)) {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }
});

Then("debo ver el campo {string}", async function (placeholder) {
  await expect(this.page.getByPlaceholder(placeholder)).toBeVisible();
});

Then("debo ver estos campos:", async function (table) {
  for (const placeholder of tableValues(table)) {
    await expect(this.page.getByPlaceholder(placeholder)).toBeVisible();
  }
});

Then("debo ver el boton {string}", async function (name) {
  await expect(this.page.getByRole("button", { name })).toBeVisible();
});

Then("debo ver estos botones:", async function (table) {
  for (const name of tableValues(table)) {
    await expect(this.page.getByRole("button", { name })).toBeVisible();
  }
});

Then("debo ver el enlace {string}", async function (name) {
  await expect(this.page.getByRole("link", { name })).toBeVisible();
});

Then("el campo {string} debe tener el valor {string}", async function (placeholder, value) {
  await expect(this.page.getByPlaceholder(placeholder)).toHaveValue(value);
});

Then("la respuesta debe ser OK", function () {
  expect(this.lastResponse?.ok()).toBeTruthy();
});

Then("la respuesta debe contener:", function (docString) {
  for (const expected of splitDocString(docString)) {
    expect(this.lastResponseBody).toContain(expected);
  }
});

Then("la respuesta no debe contener:", function (docString) {
  for (const unexpected of splitDocString(docString)) {
    expect(this.lastResponseBody).not.toContain(unexpected);
  }
});
