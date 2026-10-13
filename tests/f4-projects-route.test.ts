import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, from }),
}));

import { POST } from "../app/api/projects/route";

describe("F4 新建项目 API", () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
  });

  it("未登录时返回 401 且不写数据库", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await POST();
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("为当前用户创建空项目并返回可恢复的项目字段", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const project = { id: "p2", title: "未命名项目", current_html: null, share_token: "a".repeat(64) };
    const single = vi.fn().mockResolvedValue({ data: project, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const response = await POST();

    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalledWith("projects");
    expect(insert).toHaveBeenCalledWith({ user_id: "u1" });
    expect(await response.json()).toEqual({ project });
  });

  it("保存失败时返回可读错误", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    from.mockReturnValue({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: "db" } }) }) }) });
    const response = await POST();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "新建项目失败" });
  });
});
