import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const token = "a".repeat(64);
const old = { id: "p1", title: "旧项目", current_html: "<html>old</html>", share_token: token };

describe("F5 工作台生成进度", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("显示服务端阶段；失败后仍保留原项目访问链接", async () => {
    let push!: (chunk: string) => void;
    let close!: () => void;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        push = (chunk) => controller.enqueue(new TextEncoder().encode(chunk));
        close = () => controller.close();
      },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [old] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ project: old, messages: [] }) })
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ "Content-Type": "text/event-stream" }), body });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);

    fireEvent.click(await screen.findByRole("button", { name: "旧项目" }));
    await screen.findByRole("link", { name: "打开项目" });
    fireEvent.change(screen.getByLabelText("描述你的应用"), { target: { value: "加一个筛选器" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(await screen.findByText("请求中")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/generate", expect.objectContaining({ headers: expect.objectContaining({ Accept: "text/event-stream" }) }));

    push('data: {"stage":"generating"}\n\n');
    expect(await screen.findByText("生成中")).toBeInTheDocument();
    push('data: {"stage":"parsing"}\n\n');
    expect(await screen.findByText("解析中")).toBeInTheDocument();
    push('data: {"stage":"saving"}\n\n');
    expect(await screen.findByText("保存中")).toBeInTheDocument();
    push('data: {"stage":"error","error":"模型暂时不可用"}\n\n');
    close();
    expect(await screen.findByRole("alert")).toHaveTextContent("模型暂时不可用");
    expect(screen.getByRole("link", { name: "打开项目" })).toHaveAttribute("href", `/p/${token}`);
  });

  it("状态流无完成事件就结束时显示失败，保留可重试的输入", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"stage":"generating"}\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ "Content-Type": "text/event-stream" }), body });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);
    fireEvent.change(screen.getByLabelText("描述你的应用"), { target: { value: "做一个待办应用" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("生成中断");
    expect(screen.getByLabelText("描述你的应用")).toHaveValue("做一个待办应用");
  });
});
