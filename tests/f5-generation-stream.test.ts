import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const generateHtml = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, from }),
}));
vi.mock("../lib/ai/generate", async (original) => ({
  ...(await original<typeof import("../lib/ai/generate")>()),
  generateHtml,
}));

import { POST } from "../app/api/generate/route";

const request = () => new Request("http://localhost:3000/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
  body: JSON.stringify({ prompt: "做一个待办应用" }),
});

function events(body: string) {
  return body.trim().split("\n\n").map((part) => JSON.parse(part.slice(6)));
}

describe("F5 服务端生成状态流", () => {
  beforeEach(() => {
    getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
    generateHtml.mockReset();
    from.mockReset();
  });

  it("按真实操作顺序报告生成、解析、保存和完成", async () => {
    generateHtml.mockImplementation(async (_input, onProgress) => {
      onProgress?.("parsing");
      return "<html><body>Todo</body></html>";
    });
    from.mockImplementation((table: string) => table === "projects"
      ? { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "p1", share_token: "a".repeat(64) }, error: null }) }) }) }
      : { insert: async () => ({ error: null }) });

    const response = await POST(request());
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const stages = events(await response.text());
    expect(stages.map((item) => item.stage)).toEqual(["generating", "parsing", "saving", "success"]);
    expect(stages.at(-1)).toMatchObject({ projectId: "p1", shareToken: "a".repeat(64) });
  });

  it("模型失败时发送 error，且不创建项目", async () => {
    generateHtml.mockRejectedValue(new Error("模型暂时不可用"));
    const response = await POST(request());
    expect(events(await response.text())).toEqual([
      { stage: "generating" },
      { stage: "error", error: "模型暂时不可用" },
    ]);
    expect(from).not.toHaveBeenCalled();
  });
});
