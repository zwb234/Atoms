import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const project = { id: "p1", title: "待办项目", current_html: "<html>todo</html>", share_token: "a".repeat(64) };

describe("F6 工作台对话区", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("历史会话区分双方消息，并在切换项目后滚动到最新消息", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [project] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project, messages: [
        { id: "m1", role: "user", content: "做一个待办应用" },
        { id: "m2", role: "assistant", content: "页面已生成" },
      ] }) }));
    render(<WorkspaceClient email="demo@example.com" />);
    const conversation = screen.getByRole("log", { name: "对话记录" });
    Object.defineProperty(conversation, "scrollHeight", { configurable: true, value: 480 });

    fireEvent.click(await screen.findByRole("button", { name: "待办项目" }));

    expect(await screen.findByText("做一个待办应用")).toBeInTheDocument();
    expect(screen.getByText("做一个待办应用").closest("[data-role]")).toHaveAttribute("data-role", "user");
    expect(screen.getByText("页面已生成").closest("[data-role]")).toHaveAttribute("data-role", "assistant");
    await waitFor(() => expect(conversation.scrollTop).toBe(480));
  });

  it("Enter 发送需求，Shift+Enter 保留换行输入", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);
    const composer = screen.getByRole("textbox", { name: "描述你的应用" });
    fireEvent.change(composer, { target: { value: "做一个日程表" } });

    expect(fireEvent.keyDown(composer, { key: "Enter", shiftKey: true })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fireEvent.keyDown(composer, { key: "Enter" })).toBe(false);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("请求期间立即显示待发送消息与助手加载态，并阻止重复提交", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);
    fireEvent.change(screen.getByRole("textbox", { name: "描述你的应用" }), { target: { value: "做一个记账应用" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));

    expect(await within(screen.getByRole("log", { name: "对话记录" })).findByText("做一个记账应用")).toHaveTextContent("做一个记账应用");
    expect(within(screen.getByRole("log", { name: "对话记录" })).getByText("做一个记账应用").closest("[data-role]")).toHaveAttribute("data-role", "user");
    expect(screen.getByRole("status")).toHaveTextContent("请求中");
    expect(screen.getByRole("button", { name: "生成" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("切换到新项目后清除上一项目的生成阶段", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"stage":"error","error":"暂时不可用"}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ "Content-Type": "text/event-stream" }), body })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: { id: "new", title: "未命名项目" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [{ id: "new", title: "未命名项目" }] }) }));
    render(<WorkspaceClient email="demo@example.com" />);
    fireEvent.change(screen.getByRole("textbox", { name: "描述你的应用" }), { target: { value: "做一个日程表" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(await screen.findByRole("status")).toHaveTextContent("生成失败");

    fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    await screen.findByRole("button", { name: "未命名项目" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
