import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

describe("F7 发送后输入框状态", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("提交后立即清空输入框，并在请求期间把需求显示在对话中", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockImplementationOnce(() => new Promise(() => {})));
    await act(async () => { render(<WorkspaceClient email="demo@example.com" />); });
    const composer = screen.getByRole("textbox", { name: "描述你的应用" });
    fireEvent.change(composer, { target: { value: "做一个待办应用" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));

    expect(composer).toHaveValue("");
    expect(within(screen.getByRole("log", { name: "对话记录" })).getByText("做一个待办应用")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("请求中");
  });

  it("失败后恢复未被编辑的需求，允许直接重试", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "服务暂时不可用" }) }));
    await act(async () => { render(<WorkspaceClient email="demo@example.com" />); });
    const composer = screen.getByRole("textbox", { name: "描述你的应用" });
    fireEvent.change(composer, { target: { value: "做一个日历" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));

    expect(composer).toHaveValue("");
    await screen.findByRole("alert");
    expect(composer).toHaveValue("做一个日历");
    expect(screen.getByRole("button", { name: "生成" })).toBeEnabled();
  });

  it("成功回包不抹掉请求期间键入的新草稿", async () => {
    let resolveRequest!: (value: unknown) => void;
    const response = new Promise((resolve) => { resolveRequest = resolve; });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockImplementationOnce(() => response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) }));
    await act(async () => { render(<WorkspaceClient email="demo@example.com" />); });
    const composer = screen.getByRole("textbox", { name: "描述你的应用" });
    fireEvent.change(composer, { target: { value: "第一版需求" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    fireEvent.change(composer, { target: { value: "下一版需求" } });
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stage: "success", projectId: "p1", shareToken: "a".repeat(64), html: "<html></html>" })}\n\n`));
        controller.close();
      },
    });
    resolveRequest({ ok: true, headers: new Headers({ "Content-Type": "text/event-stream" }), body });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已完成"));
    expect(composer).toHaveValue("下一版需求");
  });
});
