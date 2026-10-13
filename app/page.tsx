import React from "react";
import { createSupabaseServerClient } from "../lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  const entryUrl = signedIn ? "/workspace" : "/login";
  return (
    <main className="landing-page">
      <nav className="landing-nav"><a className="brand" href="/"><span className="brand-mark">✦</span> Atoms</a><a className="nav-link" href={entryUrl}>{signedIn ? "进入工作台" : "登录"} <span>↗</span></a></nav>
      <section className="hero-section">
        <div className="hero-kicker"><span className="status-dot" /> YOUR NEXT APP STARTS HERE</div>
        <h1 aria-label="Atoms Demo — 想法很快。产品更快。">想法很快。<br /><span>产品更快。</span></h1>
        <p>用自然语言描述你的想法，AI 会生成一个真实可交互的网页应用。即时预览，持续迭代。</p>
        <a className="primary-button hero-button" href={entryUrl}>{signedIn ? "继续创建" : "开始创建"} <span>→</span></a>
        <div className="hero-meta"><span>✦ Powered by AI</span><span>·</span><span>实时预览</span><span>·</span><span>可持续迭代</span></div>
      </section>
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <section className="landing-preview-card"><div className="preview-bar"><span /><span /><span /><small>atoms / workspace</small></div><div className="preview-grid"><div className="preview-sidebar"><div className="skeleton short" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton active-skeleton" /></div><div className="preview-content"><div className="skeleton title-skeleton" /><div className="skeleton wide" /><div className="skeleton medium" /><div className="preview-buttons"><i /><i /><i /></div></div></div></section>
    </main>
  );
}
