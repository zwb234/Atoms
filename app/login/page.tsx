"use client";

import React, { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import { validateCredentials } from "../../lib/auth/validation";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateCredentials({ email, password });

    if (Object.keys(errors).length > 0) {
      setMessage(Object.values(errors).join("；"));
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setMessage(/email not confirmed/i.test(result.error.message)
          ? "邮箱尚未验证。Demo 管理员请在 Supabase 的 Authentication → Sign In / Providers → User Signups 中关闭 Confirm email；已有账号可先通过确认邮件完成验证。"
          : result.error.message);
      } else {
        if (mode === "login") {
          window.location.assign("/workspace");
        } else if (result.data.session) {
          window.location.assign("/workspace");
        } else {
          setMessage("注册请求已受理，但尚未建立登录会话。请检查 Supabase 的 Authentication → Sign In / Providers → User Signups → Confirm email 配置；若保持开启，请先完成邮件确认。");
        }
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "认证服务暂不可用";
      setMessage(rawMessage.includes("Missing NEXT_PUBLIC_SUPABASE")
        ? "Supabase 配置缺失：请在 .env.local 填写 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY，然后重启开发服务器。"
        : rawMessage);
    } finally {
      setBusy(false);
    }
  }

  const isRegistering = mode === "register";

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-shell" aria-label="Atoms Demo 认证">
        <div className="auth-showcase">
          <a className="brand" href="/"><span className="brand-mark">✦</span> Atoms</a>
          <div className="showcase-copy">
            <p className="eyebrow">AI APP BUILDER</p>
            <h2>把一个想法，<br /><em>变成可运行的产品。</em></h2>
            <p className="showcase-description">用自然语言描述你的应用，Atoms 会生成真实可交互的网页，并在右侧即时预览。</p>
          </div>
          <div className="showcase-chip"><span className="status-dot" /> DeepSeek Agent <span className="chip-arrow">↗</span></div>
        </div>
        <div className="auth-card">
          <div className="auth-card-heading">
            <p className="eyebrow">WELCOME BACK</p>
            <h1>{isRegistering ? "创建 Atoms Demo 账号" : "登录 Atoms Demo"}</h1>
            <p>{isRegistering ? "注册后即可保存和恢复你的项目。" : "继续构建你的下一个产品。"}</p>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="认证模式">
            <button type="button" role="tab" aria-selected={!isRegistering} className={!isRegistering ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>登录</button>
            <button type="button" role="tab" aria-selected={isRegistering} className={isRegistering ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); }}>注册</button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">邮箱</label>
              <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="field-group">
              <label htmlFor="password">密码</label>
              <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位字符" autoComplete={isRegistering ? "new-password" : "current-password"} />
            </div>
            <button className="primary-button" type="submit" aria-label={isRegistering ? "注册" : "登录"} disabled={busy}>{busy ? "处理中…" : isRegistering ? "注册" : "登录"}<span>→</span></button>
          </form>
          {message ? <p className="auth-message" role="alert">{message}</p> : null}
          <p className="auth-footer">{isRegistering ? "已有账号？" : "还没有账号？"} <button type="button" onClick={() => { setMode(isRegistering ? "login" : "register"); setMessage(""); }}>{isRegistering ? "返回登录" : "注册"}</button></p>
        </div>
      </section>
    </main>
  );
}
