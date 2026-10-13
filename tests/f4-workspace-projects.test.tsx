import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const token = "b".repeat(64);
const projects = [
  { id: "old", title: "旧项目", current_html: "<html>old</html>", share_token: token },
];

describe("F4 新建与历史恢复", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("点击新建项目后建立空会话，并可切回旧项目恢复消息和链接", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: projects[0], messages: [{ id: "m1", role: "user", content: "旧需求" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: { id: "new", title: "未命名项目", current_html: null, share_token: "c".repeat(64) } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [{ id: "new", title: "未命名项目" }, ...projects] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: projects[0], messages: [{ id: "m1", role: "user", content: "旧需求" }] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);

    fireEvent.click(await screen.findByRole("button", { name: "旧项目" }));
    expect(await screen.findByText(/旧需求/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开项目" })).toHaveAttribute("href", `/p/${token}`);
    expect(screen.getByTitle("生成结果预览")).toHaveAttribute("srcdoc", "<html>old</html>");
    expect(screen.getByRole("tab", { name: "预览" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "对话" }));
    expect(screen.getByRole("tab", { name: "对话" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/projects", { method: "POST" }));
    await screen.findByRole("button", { name: "未命名项目" });
    expect(screen.queryByText(/旧需求/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "打开项目" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("生成结果预览")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "对话" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "旧项目" }));
    expect(await screen.findByText(/旧需求/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开项目" })).toHaveAttribute("href", `/p/${token}`);
    expect(screen.getByTitle("生成结果预览")).toHaveAttribute("srcdoc", "<html>old</html>");
  });
});
