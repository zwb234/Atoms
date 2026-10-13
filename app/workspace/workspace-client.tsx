"use client";

import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { buildIterationRequest } from "../../lib/conversation/context";
import type { GenerateHistoryItem } from "../../lib/ai/generate";
import { previewSandbox } from "../../lib/html/preview";

type Project = { id: string; title: string; current_html?: string | null; share_token?: string };
type Message = { id?: string; role: "user" | "assistant"; content: string; html?: string | null };

export default function WorkspaceClient({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [currentHtml, setCurrentHtml] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState<"idle" | "requesting" | "generating" | "parsing" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [linkFeedback, setLinkFeedback] = useState<"copied" | "copy-error" | "opened" | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const messagesRef = useRef<HTMLDivElement>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadProjects();
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, pendingPrompt, generationStage]);

  useEffect(() => () => {
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
  }, []);

  function clearCopyFeedback() {
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = null;
    setLinkFeedback(null);
  }

  async function loadProjects() {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const data = await response.json() as { projects?: Project[] };
    setProjects(data.projects || []);
  }

  async function openProject(id: string) {
    if (busy || projectLoading || renameBusy) return;
    clearCopyFeedback();
    setProjectLoading(true);
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("项目读取失败");
      const data = await response.json() as { project: Project; messages: Message[] };
      setProjectId(data.project.id);
      setCurrentHtml(data.project.current_html || "");
      setShareToken(data.project.share_token || "");
      setLinkFeedback(null);
      setMessages(data.messages || []);
      setPendingPrompt("");
      setGenerationStage("idle");
      setPrompt("");
      setError("");
      setEditingTitle(false);
      setRenameError("");
      setMobileView(data.project.current_html ? "preview" : "chat");
    } catch {
      setError("项目读取失败，请重试");
    } finally {
      setProjectLoading(false);
    }
  }

  async function handleNewProject() {
    if (busy || projectLoading || renameBusy) return;
    clearCopyFeedback();
    setProjectLoading(true);
    setError("");
    setEditingTitle(false);
    setRenameError("");
    try {
      const response = await fetch("/api/projects", { method: "POST" });
      if (!response.ok) throw new Error("新建项目失败");
      const data = await response.json() as { project: Project };
      setProjectId(data.project.id);
      setCurrentHtml("");
      setShareToken("");
      setLinkFeedback(null);
      setMessages([]);
      setPendingPrompt("");
      setGenerationStage("idle");
      setPrompt("");
      setMobileView("chat");
      await loadProjects();
    } catch {
      setError("新建项目失败，请重试");
    } finally {
      setProjectLoading(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    const submittedPrompt = prompt.trim();
    setPrompt("");
    setBusy(true);
    setPendingPrompt(submittedPrompt);
    setGenerationStage("requesting");
    setError("");

    const history: GenerateHistoryItem[] = messages.map(({ role, content }) => ({ role, content }));
    const body = buildIterationRequest(projectId, currentHtml, history, submittedPrompt);
    let succeeded = false;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setGenerationStage("error");
        setError(data.error || "生成失败");
        return;
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        throw new Error("生成服务未返回进度流");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        const records = buffer.split("\n\n");
        buffer = records.pop() || "";
        for (const record of records) {
          if (!record.startsWith("data: ")) continue;
          const data = JSON.parse(record.slice(6)) as { stage: typeof generationStage; error?: string; projectId?: string; shareToken?: string; html?: string };
          setGenerationStage(data.stage);
          if (data.stage === "error") {
            completed = true;
            setError(data.error || "生成失败");
          }
          if (data.stage === "success" && data.html && data.projectId && data.shareToken) {
            completed = true;
            succeeded = true;
            setProjectId(data.projectId);
            setCurrentHtml(data.html);
            setShareToken(data.shareToken);
            setLinkFeedback(null);
            setMessages((items) => [...items, { role: "user", content: submittedPrompt }, { role: "assistant", content: "页面已生成，项目链接可直接打开。", html: data.html }]);
            setMobileView("preview");
            await loadProjects();
          }
        }
        if (chunk.done) break;
      }
      if (!completed) throw new Error("生成中断，请重试");
    } catch (error) {
      setGenerationStage("error");
      setError(error instanceof Error ? error.message : "网络请求失败，请稍后重试");
    } finally {
      if (!succeeded) setPrompt((draft) => draft || submittedPrompt);
      setPendingPrompt("");
      setBusy(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!busy && prompt.trim()) event.currentTarget.form?.requestSubmit();
  }

  async function handleCopyLink() {
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = null;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("剪贴板不可用");
      await navigator.clipboard.writeText(projectUrl || projectPath);
      setLinkFeedback("copied");
      copyFeedbackTimer.current = setTimeout(() => {
        setLinkFeedback(null);
        copyFeedbackTimer.current = null;
      }, 3000);
    } catch {
      setLinkFeedback("copy-error");
    }
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = titleDraft.trim();
    if (!projectId || !title || renameBusy) return;
    setRenameBusy(true);
    setRenameError("");
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, title }),
      });
      if (!response.ok) throw new Error("项目改名失败");
      const data = await response.json() as { project: Project };
      setProjects((items) => items.map((item) => item.id === data.project.id ? { ...item, title: data.project.title } : item));
      setEditingTitle(false);
    } catch {
      setRenameError("项目改名失败，请重试");
    } finally {
      setRenameBusy(false);
    }
  }

  const projectPath = shareToken && currentHtml ? `/p/${shareToken}` : "";
  const projectUrl = projectPath ? `${origin}${projectPath}` : "";
  const stageLabels = { requesting: "请求中", generating: "生成中", parsing: "解析中", saving: "保存中", success: "已完成", error: "生成失败" } as const;
  const activeProject = projects.find((project) => project.id === projectId);

  return (
    <main className="workspace-layout" data-mobile-view={mobileView}>
        <aside className="workspace-sidebar">
          <h1>工作台</h1>
          <button className="workspace-new-project" type="button" onClick={() => void handleNewProject()} disabled={busy || projectLoading}>新建项目</button>
          <h2>历史项目</h2>
          <div className="project-list">{projects.length === 0 ? <p>暂无项目</p> : projects.map((project) => (
            <button type="button" key={project.id} className={projectId === project.id ? "active" : ""} onClick={() => void openProject(project.id)} disabled={busy || projectLoading}>{project.title}</button>
          ))}</div>
        </aside>
        <div className="workspace-mobile-tabs" role="tablist" aria-label="工作台视图">
          <button type="button" role="tab" aria-selected={mobileView === "chat"} onClick={() => setMobileView("chat")}>对话</button>
          <button type="button" role="tab" aria-selected={mobileView === "preview"} onClick={() => setMobileView("preview")}>预览</button>
        </div>
        <section className="workspace-main">
          <header className="workspace-thread-header">
            <div>
              <span className="workspace-thread-label">对话</span>
              {editingTitle ? <form className="workspace-rename-form" onSubmit={handleRename}>
                <label className="sr-only" htmlFor="project-title">项目名称</label>
                <input id="project-title" value={titleDraft} maxLength={60} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Escape") { setEditingTitle(false); setRenameError(""); }
                }} autoFocus />
                <button type="submit" aria-label="保存名称" title="保存名称" disabled={renameBusy || !titleDraft.trim()}>保存</button>
                <button type="button" aria-label="取消改名" title="取消改名" onClick={() => { setEditingTitle(false); setRenameError(""); }}>取消</button>
              </form> : <div className="workspace-title-row">
                <h2>{activeProject?.title || "新项目"}</h2>
                {activeProject ? <button type="button" className="workspace-rename-trigger" aria-label="重命名项目" title="重命名项目" disabled={busy || projectLoading} onClick={() => {
                  setTitleDraft(activeProject.title);
                  setRenameError("");
                  setEditingTitle(true);
                }}>✎</button> : null}
              </div>}
              {renameError ? <p className="workspace-rename-error" role="alert">{renameError}</p> : null}
            </div>
          </header>
          <div className="workspace-messages" role="log" aria-label="对话记录" ref={messagesRef}>
            {messages.length === 0 && !pendingPrompt ? <div className="workspace-empty"><span className="workspace-empty-mark">✦</span><h3>开始新对话</h3></div> : null}
            <div className="workspace-message-list">
              {messages.map((message, index) => <article className={`workspace-message workspace-message-${message.role}`} data-role={message.role} key={message.id || `${message.role}-${index}`}>
                <span className="workspace-message-author">{message.role === "user" ? "你" : "Atoms"}</span>
                <p>{message.content}</p>
              </article>)}
              {pendingPrompt ? <article className="workspace-message workspace-message-user workspace-message-pending" data-role="user"><span className="workspace-message-author">你</span><p>{pendingPrompt}</p></article> : null}
              {generationStage !== "idle" ? <div className="workspace-generation-feedback">
                {busy ? <span className="workspace-loading-dots" aria-hidden="true"><i /><i /><i /></span> : null}
                <p className="generation-stage" role="status">{stageLabels[generationStage]}</p>
              </div> : null}
            </div>
          </div>
          <form className="workspace-composer" onSubmit={handleGenerate}>
            <label htmlFor="prompt">描述你的应用</label>
            <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="例如：做一个可增删改的待办事项应用" rows={3} />
            <div className="composer-row"><button className="primary-button" type="submit" aria-label="生成" disabled={busy || !prompt.trim()}>{busy ? "生成中…" : "生成"}<span>→</span></button></div>
          </form>
          {error ? <p className="workspace-error" role="alert">{error}</p> : null}
        </section>
        <section className="workspace-preview" aria-label="产物预览区域">
          <header className="workspace-preview-header">
            <h2>产物预览</h2>
            {projectPath ? <div className="workspace-preview-actions">
              <a href={projectPath} target="_blank" rel="noopener noreferrer" aria-label="打开项目" title="在新标签页打开项目" onClick={() => setLinkFeedback("opened")}>打开项目 ↗</a>
              <button type="button" className={linkFeedback === "copied" ? "is-copied" : ""} onClick={() => void handleCopyLink()}>{linkFeedback === "copied" ? "已复制" : "复制链接"}</button>
            </div> : null}
          </header>
          {projectPath ? <div className="workspace-project-link">
            <span>项目访问链接</span>
            <a href={projectPath} target="_blank" rel="noopener noreferrer" aria-label="项目链接" title="在新标签页打开项目" onClick={() => setLinkFeedback("opened")}>{projectUrl || projectPath}</a>
            {linkFeedback ? <small className="workspace-link-feedback" role={linkFeedback === "copy-error" ? "alert" : "status"}>
              {linkFeedback === "copied" ? "已复制链接" : linkFeedback === "copy-error" ? "复制失败，请手动复制链接" : "已在新标签页打开"}
            </small> : null}
          </div> : null}
          <div className="workspace-preview-content">
            {currentHtml ? <iframe title="生成结果预览" srcDoc={currentHtml} sandbox={previewSandbox} /> : <div className="workspace-preview-empty">生成后将在这里预览应用</div>}
          </div>
        </section>
    </main>
  );
}
