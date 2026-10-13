# Atoms Demo

Atoms 风格的最简 Demo：用户用自然语言描述应用，服务端调用 DeepSeek 生成单文件 HTML，并提供可分享的项目访问链接。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

填写以下服务端变量后，认证、数据库与生成流程才能运行：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（也兼容旧的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`

`DEEPSEEK_API_KEY` 只能放在 `.env.local` 或 Vercel 服务端环境变量，禁止使用 `NEXT_PUBLIC_` 前缀。

## Supabase

执行 `supabase/schema.sql` 创建 `projects`、`messages` 表并启用 RLS。

已有数据库不要重跑完整 schema；执行 `supabase/migrations/20261013_public_project_links.sql` 增加项目分享令牌与只读 HTML 函数。令牌链接允许持有者免登录访问生成页面，项目对话和编辑仍受登录与 RLS 保护。

配置 Auth Site URL 与本地/生产 Redirect URLs。

Demo 要求注册后直接登录时，在 Supabase Dashboard 的 `Authentication → Sign In / Providers → User Signups` 中关闭 `Confirm email` 并保存。可访问 `<Supabase Project URL>/auth/v1/settings`，确认 `mailer_autoconfirm` 为 `true`；若仍为 `false`，注册后会要求邮件确认。此设置影响该 Supabase 项目的所有新注册用户。

## 验证

```bash
npm test
npm run build
```

## 部署

将仓库导入 Vercel，配置 `.env.local` 中的变量，再把 Vercel 域名回填 Supabase Auth 配置。

无需自建云服务器。

完整小白部署步骤见：[从 0 到 1 部署指南](./docs/从0到1部署指南.md)。
