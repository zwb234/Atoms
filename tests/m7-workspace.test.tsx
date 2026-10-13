import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkspaceClient from "../app/workspace/workspace-client";

describe("M7 workspace", () => {
  it("renders prompt input, history and an empty preview panel", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ projects: [] }) }));

    render(<WorkspaceClient email="demo@example.com" />);

    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(screen.getByLabelText("描述你的应用")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "历史项目" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "产物预览" })).toBeInTheDocument();
    expect(screen.getByText("生成后将在这里预览应用")).toBeInTheDocument();
    expect(screen.queryByTitle("生成结果预览")).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/projects"));
  });
});
