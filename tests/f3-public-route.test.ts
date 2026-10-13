import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ rpc }),
}));

import { GET } from "../app/p/[shareToken]/route";

const token = "a".repeat(64);
const request = new Request(`http://localhost:3000/p/${token}`);

describe("F3 公共项目页面", () => {
  beforeEach(() => rpc.mockReset());

  it("持令牌者无需登录即可取得被隔离的完整 HTML", async () => {
    rpc.mockResolvedValue({ data: "<!doctype html><html><body>Todo</body></html>", error: null });

    const response = await GET(request, { params: { shareToken: token } });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/html/);
    expect(response.headers.get("content-security-policy")).toContain("sandbox allow-scripts allow-forms");
    expect(response.headers.get("content-security-policy")).not.toContain("allow-same-origin");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await response.text()).toContain("<body>Todo</body>");
    expect(rpc).toHaveBeenCalledWith("get_shared_project_html", { token });
  });

  it("无效令牌直接返回 404，不查询数据库", async () => {
    const response = await GET(request, { params: { shareToken: "not-a-token" } });
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("项目不存在或 HTML 为空时返回 404", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await GET(request, { params: { shareToken: token } });
    expect(response.status).toBe(404);
  });
});
