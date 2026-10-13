import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "../app/login/page";
import SignOutButton from "../app/workspace/sign-out-button";
import { validateCredentials } from "../lib/auth/validation";

describe("M2 authentication", () => {
  it("rejects incomplete credentials", () => {
    expect(validateCredentials({ email: "", password: "" })).toEqual({
      email: "请输入邮箱",
      password: "请输入密码",
    });
  });

  it("rejects malformed email and short password", () => {
    expect(validateCredentials({ email: "invalid", password: "123" })).toEqual({
      email: "请输入有效邮箱",
      password: "密码至少 6 位",
    });
  });

  it("renders login and registration controls", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: /登录 atoms demo/i })).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册" })).toBeInTheDocument();
  });

  it("uses the primary submit button for registration after switching mode", () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "注册" }));

    expect(screen.getByRole("heading", { name: /创建 atoms demo 账号/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "返回登录" })).toHaveAttribute("type", "button");
  });

  it("explains how to fix missing Supabase configuration", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Supabase 配置缺失/i);
  });

  it("renders a logout control", () => {
    render(<SignOutButton />);

    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
  });
});
