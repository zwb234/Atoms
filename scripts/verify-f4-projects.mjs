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
const email = `f4-${nonce}@example.com`;
const password = `T${nonce}a9!`;
const title = `F4 验收 ${nonce.slice(0, 8)}`;

const signup = await supabase.auth.signUp({ email, password });
if (signup.error || !signup.data.user || !signup.data.session) {
  throw new Error("无法建立 F4 测试会话");
}

const html = "<!doctype html><html><body>F4 历史页面</body></html>";
const created = await supabase.from("projects")
  .insert({ user_id: signup.data.user.id, title, current_html: html })
  .select("id,share_token")
  .single();
if (created.error || !created.data) throw new Error("无法建立 F4 历史项目");
const oldProject = created.data;
const message = await supabase.from("messages")
  .insert({ project_id: oldProject.id, role: "user", content: "F4 历史消息" });
if (message.error) throw new Error("无法建立 F4 历史消息");

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

  await page.getByRole("button", { name: title }).click();
  await page.getByText("F4 历史消息").waitFor();
  const oldLink = page.getByRole("link", { name: "打开项目" });
  if (!oldLink || await oldLink.getAttribute("href") !== `/p/${oldProject.share_token}`) {
    throw new Error("历史项目链接未恢复");
  }

  await page.getByRole("button", { name: "新建项目" }).click();
  await page.getByRole("button", { name: "未命名项目" }).waitFor();
  if (await page.getByText("F4 历史消息").count() !== 0) throw new Error("新项目仍显示旧消息");
  if (await page.getByRole("link", { name: "打开项目" }).count() !== 0) throw new Error("新项目仍显示旧链接");

  await page.getByRole("button", { name: title }).click();
  await page.getByText("F4 历史消息").waitFor();
  if (await page.getByRole("link", { name: "打开项目" }).getAttribute("href") !== `/p/${oldProject.share_token}`) {
    throw new Error("切回历史项目后链接不正确");
  }
  console.log("F4 BDD 通过：新建空项目、历史消息和链接恢复");
} finally {
  await browser.close();
}
