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
const email = `g1-${nonce}@example.com`;
const password = `T${nonce}a9!`;
const signup = await supabase.auth.signUp({ email, password });
if (signup.error || !signup.data.session) throw new Error("无法建立临时测试会话");

const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/workspace");

  await page.goto(baseUrl);
  await page.getByRole("link", { name: /进入工作台/ }).waitFor();
  await page.reload();
  await page.getByRole("link", { name: /进入工作台/ }).waitFor();
  await page.goto(`${baseUrl}/login`);
  await page.waitForURL("**/workspace");

  const savedState = await context.storageState();
  const reopened = await browser.newContext({ storageState: savedState });
  const secondPage = await reopened.newPage();
  await secondPage.goto(baseUrl);
  await secondPage.getByRole("link", { name: /进入工作台/ }).waitFor();
  await secondPage.getByRole("link", { name: /进入工作台/ }).click();
  await secondPage.waitForURL("**/workspace");
  await secondPage.getByRole("button", { name: "退出登录" }).click();
  await secondPage.waitForURL("**/login");
  await secondPage.goto(baseUrl);
  await secondPage.getByRole("link", { name: /登录/ }).waitFor();
  await reopened.close();
  console.log("G1 BDD 通过：返回主页、刷新、重开浏览器、主动退出");
} finally {
  await browser.close();
}
