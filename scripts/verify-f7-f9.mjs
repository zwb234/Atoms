import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const baseUrl = process.env.ATOMS_TEST_BASE_URL || "http://localhost:3000";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const nonce = randomUUID().replaceAll("-", "");
const email = `f9-${nonce}@example.com`;
const password = `T${nonce}a9!`;
const signup = await supabase.auth.signUp({ email, password });
if (signup.error || !signup.data.user || !signup.data.session) throw new Error("无法建立临时测试会话");
const html = "<!doctype html><html><body>BDD 项目页面</body></html>";
const created = await supabase.from("projects")
  .insert({ user_id: signup.data.user.id, current_html: html })
  .select("id,share_token")
  .single();
if (created.error || !created.data) throw new Error("无法建立临时测试项目");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.name));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
      browserErrors.push(`${new URL(response.url()).pathname}:${response.status()}`);
    }
  });
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  try {
    await page.waitForURL("**/workspace", { timeout: 12000 });
  } catch {
    const message = (await page.getByRole("alert").textContent().catch(() => "")) || "无认证提示";
    throw new Error(`登录后未进入工作台 (${new URL(page.url()).pathname})：${message.replaceAll(email, "[email]")}；浏览器错误 ${browserErrors.join(", ") || "无"}`);
  }

  await page.getByRole("button", { name: "未命名项目" }).click();
  await page.getByRole("button", { name: "重命名项目" }).click();
  await page.getByRole("textbox", { name: "项目名称" }).fill("我的测试看板");
  await page.getByRole("button", { name: "保存名称" }).click();
  await page.getByRole("heading", { name: "我的测试看板" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "我的测试看板" }).click();
  await page.getByRole("heading", { name: "我的测试看板" }).waitFor();

  await page.getByRole("button", { name: "复制链接" }).click();
  await page.getByRole("status").getByText("已复制链接").waitFor();
  await page.getByRole("button", { name: "复制链接" }).waitFor({ timeout: 5000 });
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  if (copied !== `${baseUrl}/p/${created.data.share_token}`) throw new Error("剪贴板链接不正确");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "打开项目" }).click();
  const popup = await popupPromise;
  await popup.getByText("BDD 项目页面").waitFor();
  await page.getByRole("status").getByText("已在新标签页打开").waitFor();
  await popup.close();

  let release;
  await page.route("**/api/generate", async (route) => {
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({ stage: "success", projectId: created.data.id, shareToken: created.data.share_token, html })}\n\n`,
    });
  });
  const composer = page.getByRole("textbox", { name: "描述你的应用" });
  await composer.fill("添加筛选功能");
  await page.getByRole("button", { name: "生成" }).click();
  await page.getByRole("log", { name: "对话记录" }).getByText("添加筛选功能").waitFor();
  if (await composer.inputValue() !== "") throw new Error("提交后输入框未立即清空");
  release();
  await page.getByRole("status").getByText("已完成").waitFor();
  await page.waitForFunction(() => document.querySelector('button[aria-label="生成"]')?.textContent?.trim().startsWith("生成") && !document.querySelector('button[aria-label="生成"]')?.textContent?.includes("生成中"));
  if (await page.getByRole("log", { name: "对话记录" }).getByText("添加筛选功能", { exact: true }).count() !== 1) {
    throw new Error("生成完成后消息重复");
  }
  await page.screenshot({ path: "/tmp/atoms-f9-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/atoms-f9-mobile.png" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("手机视口出现横向溢出");
  console.log("F7–F9 BDD 通过：发送清空、复制和打开反馈、改名与刷新持久化、手机布局");
} finally {
  await browser.close();
}
