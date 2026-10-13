import { describe, expect, it } from "vitest";
import { extractHtml } from "../lib/html/extract";

describe("M4 HTML extraction", () => {
  it("returns a complete HTML document unchanged", () => {
    const html = "<!DOCTYPE html><html><body><button>OK</button></body></html>";

    expect(extractHtml(html)).toEqual({ ok: true, html });
  });

  it("unwraps a markdown html code block", () => {
    const result = extractHtml("```html\n<!doctype html><html><body>Hi</body></html>\n```");

    expect(result).toEqual({ ok: true, html: "<!doctype html><html><body>Hi</body></html>" });
  });

  it("removes explanatory text around a document", () => {
    const result = extractHtml("这是结果：\n<html><body><h1>Hi</h1></body></html>\n请查看。");

    expect(result).toEqual({ ok: true, html: "<html><body><h1>Hi</h1></body></html>" });
  });

  it("returns an explicit error for incomplete output", () => {
    expect(extractHtml("我无法生成页面")).toEqual({
      ok: false,
      error: "模型未返回完整 HTML 文档",
    });
  });
});
