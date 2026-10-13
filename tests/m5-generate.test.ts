import { describe, expect, it } from "vitest";
import { buildGenerateMessages, parseGenerateRequest } from "../lib/ai/generate";

describe("M5 generate API helpers", () => {
  it("rejects an empty prompt", () => {
    expect(parseGenerateRequest({ prompt: "" })).toEqual({
      ok: false,
      error: "请输入生成需求",
    });
  });

  it("limits prompt and history sizes", () => {
    const result = parseGenerateRequest({
      prompt: "a".repeat(5000),
      currentHtml: "b".repeat(30000),
      history: [{ role: "user", content: "c".repeat(5000) }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.prompt.length).toBeLessThanOrEqual(4000);
      expect(result.value.currentHtml.length).toBeLessThanOrEqual(20000);
      expect(result.value.history[0].content.length).toBeLessThanOrEqual(2000);
    }
  });

  it("builds a system prompt that requests only complete HTML", () => {
    const messages = buildGenerateMessages({
      prompt: "做一个待办事项应用",
      currentHtml: "<html><body>old</body></html>",
      history: [{ role: "user", content: "之前的需求" }],
    });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toMatch(/只输出纯 HTML/i);
    expect(messages.at(-1)?.content).toContain("做一个待办事项应用");
  });
});
