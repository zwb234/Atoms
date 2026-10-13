import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());

vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));

import HomePage from "../app/page";

describe("G1 登录状态持久化", () => {
  beforeEach(() => {
    getUser.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  it("已登录用户返回主页时看见工作台入口", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(await HomePage());
    expect(screen.getByRole("link", { name: /进入工作台/ })).toHaveAttribute("href", "/workspace");
    expect(screen.queryByRole("link", { name: /登录/ })).not.toBeInTheDocument();
  });

  it("未登录用户仍看见登录入口", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(await HomePage());
    expect(screen.getByRole("link", { name: /登录/ })).toHaveAttribute("href", "/login");
  });

});
