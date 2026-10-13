import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
const generateHtml = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser }, from }) }));
vi.mock("../lib/ai/generate", async (original) => ({
  ...(await original<typeof import("../lib/ai/generate")>()),
  generateHtml,
}));

import { PATCH } from "../app/api/projects/route";
import { POST as generate } from "../app/api/generate/route";

const projectId = "11111111-1111-4111-8111-111111111111";
const renameRequest = (title: string) => new Request("http://localhost:3000/api/projects", {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: projectId, title }),
});
const generateRequest = () => new Request("http://localhost:3000/api/generate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, prompt: "做一个看板应用" }),
});

describe("F9 项目命名 API", () => {
  beforeEach(() => {
    getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
    from.mockReset();
    generateHtml.mockReset().mockResolvedValue("<html>Kanban</html>");
  });

  it("改名要求登录且不能在未登录时写入", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await PATCH(renameRequest("新标题"))).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("拒绝空标题", async () => {
    const response = await PATCH(renameRequest(" \n "));
    expect(response.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("只更新当前用户的指定项目并返回新标题", async () => {
    const eq = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({ data: { id: projectId, title: "产品看板" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const update = vi.fn().mockReturnValue({ eq, select });
    from.mockReturnValue({ update });

    const response = await PATCH(renameRequest("  产品看板  "));
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: "产品看板" }));
    expect(eq).toHaveBeenCalledWith("id", projectId);
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(await response.json()).toEqual({ project: { id: projectId, title: "产品看板" } });
  });

  it("已建但未命名项目首次生成后自动命名", async () => {
    const updates: Record<string, unknown>[] = [];
    from.mockImplementation((table: string) => table === "projects" ? {
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { title: "未命名项目" }, error: null }) }) }) }),
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { share_token: "a".repeat(64) }, error: null }) }) }) }) };
      },
    } : { insert: async () => ({ error: null }) });

    expect((await generate(generateRequest())).status).toBe(200);
    expect(updates).toEqual([expect.objectContaining({ title: "看板应用", current_html: "<html>Kanban</html>" })]);
  });

  it("已命名项目再次生成不覆盖用户标题", async () => {
    const updates: Record<string, unknown>[] = [];
    from.mockImplementation((table: string) => table === "projects" ? {
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { title: "我的产品" }, error: null }) }) }) }),
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { share_token: "a".repeat(64) }, error: null }) }) }) }) };
      },
    } : { insert: async () => ({ error: null }) });

    expect((await generate(generateRequest())).status).toBe(200);
    expect(updates).toEqual([expect.not.objectContaining({ title: expect.anything() })]);
  });
});
