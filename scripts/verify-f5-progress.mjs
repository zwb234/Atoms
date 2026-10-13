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
const email = `f5-${nonce}@example.com`;
const password = `T${nonce}a9!`;
const signup = await supabase.auth.signUp({ email, password });
if (signup.error || !signup.data.session) throw new Error("无法建立 F5 测试会话");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL("**/workspace");

  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/generate"));
  await page.getByLabel("描述你的应用").fill("做一个只有计数器按钮的简洁单页应用，点击按钮数字加一。");
  await page.getByRole("button", { name: "生成" }).click();
  const response = await responsePromise;
  const body = await response.text();
  const stages = body.trim().split("\n\n")
    .filter((record) => record.startsWith("data: "))
    .map((record) => JSON.parse(record.slice(6)).stage);
  if (stages.join(",") !== "generating,parsing,saving,success") {
    throw new Error(`生成阶段异常：${stages.join(",")}`);
  }
  await page.getByRole("link", { name: "打开项目" }).waitFor();
  await page.getByText("已完成").waitFor();
  console.log(`F5 BDD 通过：${stages.join(" → ")}，项目链接已显示`);
} finally {
  await browser.close();
}
