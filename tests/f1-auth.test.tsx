import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../app/login/page";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("../lib/supabase/browser", () => ({
  createSupabaseBrowserClient: () => ({ auth }),
}));

describe("F1 邮箱确认配置反馈", () => {
  beforeEach(() => {
    auth.signUp.mockReset();
    auth.signInWithPassword.mockReset();
  });

  it("注册后未获得会话时提示检查 Confirm email 配置", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("tab", { name: "注册" }));
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Confirm email/);
    expect(auth.signUp).toHaveBeenCalledWith({ email: "demo@example.com", password: "secret123" });
  });

  it("登录被服务端拒绝时清楚说明邮箱确认阻断", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed" },
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/邮箱尚未验证/);
  });
});
