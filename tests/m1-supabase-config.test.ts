import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "../lib/supabase/config";

describe("M1 Supabase configuration", () => {
  it("rejects missing public credentials", () => {
    expect(() => getSupabaseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("returns public credentials without exposing a service role", () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("accepts the Supabase publishable key name", () => {
    expect(
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable-test",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "sb_publishable-test",
    });
  });

  it("rejects an invalid Supabase URL", () => {
    expect(() =>
      getSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toThrow(/valid URL/);
  });
});
