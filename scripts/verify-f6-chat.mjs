import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const nonce = randomUUID().replaceAll("-", "");
const email = `f6-${nonce}@example.com`;
const password = `T${nonce}a9!`;
const signup = await supabase.auth.signUp({ email, password });
if (signup.error || !signup.data.user || !signup.data.session) throw new Error("无法建立 F6 测试会话");

const html = "<!doctype html><html><body>F6 项目页面</body></html>";
const created = await supabase.from("projects")
  .insert({ user_id: signup.data.user.id, title: "F6 对话验收", current_html: html })
  .select("id,share_token")
  .single();
if (created.error || !created.data) throw new Error("无法建立 F6 测试项目");
const project = created.data;
const messages = Array.from({ length: 12 }, (_, index) => ({
  project_id: project.id,
  role: index % 2 === 0 ? "user" : "assistant",
  content: `F6 历史消息 ${index + 1}：${"测试对话内容 ".repeat(8)}`,
}));
const seeded = await supabase.from("messages").insert(messages);
if (seeded.error) throw new Error("无法建立 F6 测试消息");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const source = message.location().url;
      const category = source ? new URL(source).pathname.split("/")[1] || "/" : "unknown";
      errors.push(`${message.text()} [source: ${category}]`);
    }
  });
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/workspace");
  await page.getByRole("button", { name: "F6 对话验收" }).click();
  const log = page.getByRole("log", { name: "对话记录" });
  await log.getByText("F6 历史消息 12", { exact: false }).waitFor();
  const roles = await log.locator("[data-role]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-role")));
  if (roles.length !== 12 || roles[0] !== "user" || roles[1] !== "assistant") throw new Error("消息角色未正确区分");
  const scroll = await log.evaluate((node) => ({ top: node.scrollTop, max: node.scrollHeight - node.clientHeight }));
  if (scroll.max > 0 && scroll.top < scroll.max - 2) throw new Error("历史会话未滚动到最新消息");
  await page.screenshot({ path: "/tmp/atoms-f6-desktop.png", fullPage: false });

  let releaseResponse;
  let generateCalls = 0;
  await page.route("**/api/generate", async (route) => {
    generateCalls += 1;
    await new Promise((resolve) => { releaseResponse = resolve; });
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({ stage: "success", projectId: project.id, shareToken: project.share_token, html })}\n\n`,
    });
  });
  const composer = page.getByRole("textbox", { name: "描述你的应用" });
  await composer.fill("增加一个搜索框");
  await composer.press("Shift+Enter");
  if (generateCalls !== 0 || !String(await composer.inputValue()).includes("\n")) throw new Error("Shift+Enter 未保留换行");
  await composer.press("Enter");
  await log.getByText("增加一个搜索框", { exact: false }).waitFor();
  await page.getByRole("status").getByText("请求中").waitFor();
  if (!(await page.getByRole("button", { name: "生成" }).isDisabled()) || generateCalls !== 1) {
    throw new Error("提交后未显示加载态或未阻止重复提交");
  }
  releaseResponse();
  await page.getByRole("link", { name: "打开项目" }).waitFor();
  await page.getByRole("status").getByText("已完成").waitFor();
  await page.waitForFunction(() => !document.querySelector('button[aria-label="生成"]')?.textContent?.includes("生成中"));
  if (await page.getByRole("link", { name: "打开项目" }).getAttribute("href") !== `/p/${project.share_token}`) {
    throw new Error("成功后项目链接不正确");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/atoms-f6-mobile.png", fullPage: false });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("手机宽度出现横向溢出");
  if (!(await composer.isVisible()) || !(await page.getByRole("button", { name: "新建项目" }).isVisible())) {
    throw new Error("手机视口中输入区或新建入口不可见");
  }
  await page.getByRole("button", { name: "新建项目" }).click();
  await page.getByRole("button", { name: "未命名项目" }).waitFor();
  if (await page.getByRole("status").count() || await page.getByRole("link", { name: "打开项目" }).count()) {
    throw new Error("新项目仍显示旧项目进度或链接");
  }
  const appErrors = errors.filter((message) => !(
    message.includes("Failed to load resource: the server responded with a status of 404")
    && message.includes("[source: favicon.ico]")
  ));
  if (appErrors.length) throw new Error(`浏览器控制台错误：${appErrors.join(" | ")}`);
  console.log("F6 BDD 通过：角色气泡、历史滚动、快捷键、加载态、链接、手机布局与会话切换");
} finally {
  await browser.close();
}
