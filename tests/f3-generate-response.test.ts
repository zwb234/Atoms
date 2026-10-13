import { beforeEach, describe, expect, it, vi } from "vitest";

const token = "b".repeat(64);
const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const generateHtml = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth,
    from: (table: string) => table === "projects"
      ? { insert: () => ({ select: () => ({ single: async () => ({ data: { id: "p1", share_token: token }, error: null }) }) }) }
      : { insert: async () => ({ error: null }) },
  }),
}));
vi.mock("../lib/ai/generate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/ai/generate")>()),
  generateHtml,
}));

import { POST } from "../app/api/generate/route";

describe("F3 生成响应", () => {
  beforeEach(() => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    generateHtml.mockResolvedValue("<html><body>Todo</body></html>");
  });

  it("返回所属项目的分享令牌供工作台展示", async () => {
    const request = new Request("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "做一个待办应用" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ projectId: "p1", shareToken: token });
  });
});
