export type HtmlExtraction =
  | { ok: true; html: string }
  | { ok: false; error: string };

export function extractHtml(raw: string): HtmlExtraction {
  const normalized = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const documentStart = normalized.search(/<!doctype\s+html\b/i);
  const htmlStart = normalized.search(/<html(?:\s[^>]*)?>/i);
  const start = documentStart >= 0 ? documentStart : htmlStart;

  if (start < 0) {
    return { ok: false, error: "模型未返回完整 HTML 文档" };
  }

  const candidate = normalized.slice(start);
  const end = candidate.search(/<\/html\s*>/i);

  if (end < 0) {
    return { ok: false, error: "模型未返回完整 HTML 文档" };
  }

  const html = candidate.slice(0, end + candidate.match(/<\/html\s*>/i)![0].length).trim();
  return { ok: true, html };
}

export function validateHtmlDocument(html: string): boolean {
  return /<html(?:\s[^>]*)?>/i.test(html) && /<\/html\s*>/i.test(html);
}
