import { describe, expect, it } from "vitest";
import { makeProjectTitle } from "../lib/projects/title";

describe("F9 自动项目命名", () => {
  it("从首条需求生成简短、可识别的名称", () => {
    expect(makeProjectTitle("  帮我做一个待办事项应用，支持分类和截止日期  ")).toBe("待办事项应用，支持分类和截止日期");
  });

  it("截断长需求且不拆开 Unicode 字符", () => {
    expect(Array.from(makeProjectTitle("做一个" + "😀".repeat(50)))).toHaveLength(30);
  });

  it("空需求回退到默认名称", () => {
    expect(makeProjectTitle("  \n  ")).toBe("未命名项目");
  });
});
