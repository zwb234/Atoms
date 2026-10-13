import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../app/page";

vi.mock("../lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

describe("M0 application shell", () => {
  it("shows the Atoms Demo entry point", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { name: /atoms demo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /登录/i })).toBeInTheDocument();
  });
});
