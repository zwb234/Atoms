import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const page = await browser.newPage();
  await page.route("https://atoms-preview.test/submit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<script>parent.postMessage("form-submitted", "*")</script>',
    }),
  );

  await page.setContent(`
    <output id="result">waiting</output>
    <script>addEventListener("message", event => {
      if (event.data === "form-submitted") document.querySelector("#result").textContent = "submitted";
    })</script>
    <iframe id="preview" sandbox="allow-scripts allow-forms"></iframe>
  `);

  await page.locator("#preview").evaluate((frame) => {
    frame.srcdoc = `
      <form action="https://atoms-preview.test/submit" method="post">
        <input name="title" value="new item">
      </form>
      <script>document.querySelector("form").submit()</script>
    `;
  });

  await page.locator("#result").getByText("submitted").waitFor({ timeout: 5000 });
  assert.equal(await page.locator("#preview").getAttribute("sandbox"), "allow-scripts allow-forms");
  console.log("F2 browser BDD: form submission passed; same-origin permission absent");
} finally {
  await browser.close();
}
