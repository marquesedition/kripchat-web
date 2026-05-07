const { After, Before, setDefaultTimeout, setWorldConstructor } = require("@cucumber/cucumber");
const { chromium, request } = require("@playwright/test");

setDefaultTimeout(30 * 1000);

class KripChatWorld {
  constructor({ parameters }) {
    this.baseURL = process.env.BASE_URL || parameters?.baseURL || "http://127.0.0.1:4193";
    this.lastResponse = null;
    this.lastResponseBody = "";
  }

  async open() {
    this.browser = await chromium.launch({ headless: process.env.BDD_HEADED !== "1" });
    this.context = await this.browser.newContext({
      baseURL: this.baseURL,
      viewport: process.env.BDD_VIEWPORT === "mobile" ? { width: 412, height: 915 } : { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();
    this.api = await request.newContext({ baseURL: this.baseURL });
  }

  async close() {
    await this.api?.dispose();
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(KripChatWorld);

Before(async function () {
  await this.open();
});

After(async function () {
  await this.close();
});
