import { chromium } from "playwright";

const baseUrl = process.env.ATOMS_TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.className = "workspace-new-project";
    button.textContent = "新建项目";
    document.body.append(button);
  });
  const button = page.getByRole("button", { name: "新建项目" });
  const initial = await button.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color }));
  if (initial.background !== "rgb(30, 39, 30)") throw new Error(`默认背景仍高亮：${initial.background}`);
  await button.hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".workspace-new-project")).backgroundColor === "rgb(212, 255, 87)");
  const hovered = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  if (hovered === initial.background) throw new Error("hover 没有可见背景变化");
  await button.focus();
  const focused = await button.evaluate((element) => getComputedStyle(element).outlineStyle);
  if (focused === "none") throw new Error("键盘聚焦没有可见轮廓");
  console.log("G2 BDD 通过：默认低强调，hover 高亮，键盘聚焦可见");
} finally {
  await browser.close();
}
