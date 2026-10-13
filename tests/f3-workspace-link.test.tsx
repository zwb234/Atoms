import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

const token = "a".repeat(64);
const html = "<!doctype html><html><body>Todo</body></html>";

describe("F3 项目访问链接", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("生成后在右栏预览并保留独立访问链接", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stage: "success", projectId: "p1", shareToken: token, html })}\n\n`));
        controller.close();
      },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) })
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ "Content-Type": "text/event-stream" }), body: stream })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkspaceClient email="demo@example.com" />);

    fireEvent.change(screen.getByLabelText("描述你的应用"), { target: { value: "做一个待办应用" } });
    fireEvent.click(screen.getByRole("button", { name: "生成" }));

    const link = await screen.findByRole("link", { name: /打开项目/ });
    expect(link).toHaveAttribute("href", `/p/${token}`);
    expect(link).toHaveAttribute("target", "_blank");
    const preview = screen.getByTitle("生成结果预览");
    expect(preview).toHaveAttribute("srcdoc", html);
    expect(preview).toHaveAttribute("sandbox", "allow-scripts allow-forms");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
