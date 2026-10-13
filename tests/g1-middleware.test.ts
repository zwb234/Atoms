// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { middleware } from "../middleware";

describe("G1 会话 Cookie 刷新", () => {
  beforeEach(() => {
    createServerClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  it("已有会话访问登录页时进入工作台", async () => {
    createServerClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) } });
    const response = await middleware(new NextRequest("http://localhost:3000/login"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/workspace");
  });

  it("刷新会话时把新 Cookie 写回重定向响应", async () => {
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([{ name: "sb-session", value: "refreshed", options: { path: "/", httpOnly: false } }]);
          return { data: { user: { id: "u1" } } };
        },
      },
    }));
    const response = await middleware(new NextRequest("http://localhost:3000/login"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/workspace");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });
});
