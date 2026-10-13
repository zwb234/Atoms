import { describe, expect, it } from "vitest";
import { buildIterationRequest } from "../lib/conversation/context";

describe("M6 conversation context", () => {
  it("carries the current HTML into a follow-up request", () => {
    const result = buildIterationRequest("p1", "<html>old</html>", [], "改成暗色主题");

    expect(result).toEqual({
      projectId: "p1",
      currentHtml: "<html>old</html>",
      history: [],
      prompt: "改成暗色主题",
    });
  });

  it("keeps only the latest six messages and caps each message", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: "user" as const,
      content: `${index}-${"x".repeat(3000)}`,
    }));

    const result = buildIterationRequest("p1", "<html>old</html>", history, "继续修改");

    expect(result.history).toHaveLength(6);
    expect(result.history[0].content.startsWith("4-")).toBe(true);
    expect(result.history[0].content.length).toBeLessThanOrEqual(2000);
  });
});
