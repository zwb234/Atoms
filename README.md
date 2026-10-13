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
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
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


## 实现思路与关键取舍

```text
目标：自然语言 → 应用定义（用户自定义API或平台提供模型服务） → 受控生成与验证 → 发布版本
                         ├→ 应用界面与业务 API
                         ├→ 应用数据与迁移
                         └→ 应用用户、组织与权限
现状：自然语言 → DeepSeek → 单文件 HTML → 平台保存 → 分享链接
```

现有实现选择 Next.js 承载工作台与公开页面，Supabase 保存平台账号、项目和对话，DeepSeek 生成可运行的单文件 HTML。分享页使用高熵令牌和 CSP sandbox 隔离生成脚本。这种方案开发快，适合验证“描述需求→看到页面”的体验；代价是生成物没有可信后端，不能安全地直接管理业务数据。

## 当前完成程度

| 能力 | 当前实现 | 与目标的差距 |
|---|---|---|
| 自然语言生成 | DeepSeek 返回完整 HTML；支持同项目多轮修改（`lib/ai/generate.ts`） | 只能生成前端页面，缺少业务 API 与自动化验证 |
| 在线访问 | 已完成线上部署；代码提供公开项目链接 | 单页链接并非独立应用发布管理 |
| 项目管理 | 平台账号、历史项目、对话保存、自动命名与改名 | 暂无版本发布、回滚与项目成员协作 |
| 应用业务数据 | Supabase 仅存平台项目与对话 | 生成应用不能创建、管理或迁移自己的业务数据表 |
| 应用用户与权限 | 平台项目由所有者访问；持链接者可查看生成页面 | 暂无应用内注册、组织、角色、资源级授权和审计 |
| B/C 端使用 | 生成页面中的前端交互可运行 | 多用户共享数据、隔离、可靠性和运营能力尚未建立 |

因此，当前适合展示界面原型和轻量、无敏感共享数据的工具。个人管理平台若要求跨设备保存任务、记录或客户资料，仍需应用级数据服务；面向外部用户或企业客户时，还需租户隔离、授权和运维能力。生成页内自行维护的状态不能等同于平台数据库持久化。

## 继续投入的优先级

| 优先级 | 具体任务 | 交付物定义 | 前置依赖 |
|---|---|---|---|
| P0 | 明确首个应用类型及数据、角色边界 | 一套可验收的业务场景、实体关系和角色权限矩阵 | 选择个人工具或一个具体 B/C 端场景 |
| P0 | 建立应用级数据与授权基础 | 每个应用可管理的实体、受控 CRUD API、行级授权和数据隔离测试 | 已确定的数据模型与身份边界 |
| P0 | 让生成器产出结构化应用定义 | 页面、实体、字段、操作与角色声明；生成前校验，发布前测试 | 应用级 API 与权限模型稳定 |
| P1 | 增加应用管理控制台 | 数据浏览与导入导出、成员邀请、角色配置、操作审计 | 应用级数据与授权可用 |
| P1 | 建立草稿、发布、回滚流程 | 可复现的版本、发布记录与失败回退 | 结构化生成物和迁移机制 |
| P2 | 增强对外运营能力 | 自定义域名、配额、监控告警、备份与租户管理 | 至少一个真实应用通过持续使用验证 |


