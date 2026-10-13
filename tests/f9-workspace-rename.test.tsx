import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const project = { id: "p1", title: "未命名项目", current_html: null, share_token: "a".repeat(64) };

describe("F9 工作台项目改名", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("保存新标题后同步工作台标题和历史列表", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [project] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project, messages: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: { id: "p1", title: "我的看板" } }) });
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => { render(<WorkspaceClient email="demo@example.com" />); });
    fireEvent.click(screen.getByRole("button", { name: "未命名项目" }));
    await screen.findByRole("heading", { name: "未命名项目" });
    fireEvent.click(screen.getByRole("button", { name: "重命名项目" }));
    fireEvent.change(screen.getByRole("textbox", { name: "项目名称" }), { target: { value: "我的看板" } });
    fireEvent.click(screen.getByRole("button", { name: "保存名称" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "我的看板" })).toBeVisible());
    expect(screen.getByRole("button", { name: "我的看板" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ id: "p1", title: "我的看板" }),
    }));
  });
});
