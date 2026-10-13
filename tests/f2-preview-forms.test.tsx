import { describe, expect, it } from "vitest";
import { previewSandbox } from "../lib/html/preview";

describe("F2 表单预览权限", () => {
  it("保留 F2 的最小沙箱权限定义", () => {
    expect(previewSandbox).toBe("allow-scripts allow-forms");
    expect(previewSandbox).not.toContain("allow-same-origin");
  });
});
