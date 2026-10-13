import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const project = { id: "p1", title: "待办应用", current_html: "<html>Todo</html>", share_token: "a".repeat(64) };

async function openProject() {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [project] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ project, messages: [] }) }));
  vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }));
  const view = render(<WorkspaceClient email="demo@example.com" />);
  fireEvent.click(await screen.findByRole("button", { name: "待办应用" }));
  await screen.findByRole("button", { name: "复制链接" });
  return view;
}

async function copyLink() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /复制链接|已复制/ }));
  });
}

describe("G3 复制状态复位", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("复制成功约三秒后恢复按钮和提示", async () => {
    await openProject();
    vi.useFakeTimers();
    await copyLink();
    expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole("button", { name: "复制链接" })).toBeInTheDocument();
    expect(screen.queryByText("已复制链接")).not.toBeInTheDocument();
  });

  it("重复复制重新计时，卸载时清理计时器", async () => {
    const view = await openProject();
    vi.useFakeTimers();
    await copyLink();
    await act(async () => { vi.advanceTimersByTime(2000); });
    await copyLink();
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("切换到新项目时清除旧项目的复制计时", async () => {
    await openProject();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ project: { id: "p2", title: "未命名项目", share_token: "b".repeat(64) } }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ projects: [{ id: "p2", title: "未命名项目" }, project] }),
    } as Response);
    vi.useFakeTimers();
    await copyLink();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "新建项目" })); });
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByRole("button", { name: "已复制" })).not.toBeInTheDocument();
  });
});
