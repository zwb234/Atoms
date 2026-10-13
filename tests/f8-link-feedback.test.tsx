import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const project = { id: "p1", title: "待办应用", current_html: "<html>Todo</html>", share_token: "a".repeat(64) };

async function openExistingProject(writeText: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [project] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ project, messages: [] }) }));
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { clipboard: { writeText } }));
  await act(async () => { render(<WorkspaceClient email="demo@example.com" />); });
  fireEvent.click(screen.getByRole("button", { name: "待办应用" }));
  await screen.findByRole("link", { name: "打开项目" });
}

describe("F8 项目链接反馈", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("复制成功后显示确认并保持项目链接可打开", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await openExistingProject(writeText);
    fireEvent.click(screen.getByRole("button", { name: "复制链接" }));

    expect(await screen.findByRole("status")).toHaveTextContent("已复制链接");
    expect(screen.getByRole("button", { name: "已复制" })).toBeVisible();
    expect(screen.getByRole("link", { name: "打开项目" })).toHaveAttribute("href", `/p/${project.share_token}`);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/${project.share_token}`);
  });

  it("复制失败后显示错误且允许重试", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    await openExistingProject(writeText);
    fireEvent.click(screen.getByRole("button", { name: "复制链接" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("复制失败");
    expect(screen.getByRole("button", { name: "复制链接" })).toBeEnabled();
  });

  it("点击访问链接后出现打开反馈", async () => {
    await openExistingProject(vi.fn().mockResolvedValue(undefined));
    fireEvent.click(screen.getByRole("link", { name: "打开项目" }));

    expect(screen.getByRole("status")).toHaveTextContent("已在新标签页打开");
  });
});
