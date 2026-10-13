import { extractHtml } from "../html/extract";

export const SYSTEM_PROMPT = `你是一个专业的前端工程师。请根据用户需求生成一个完整、可直接运行的单文件 HTML 应用。
强制要求：
1. 只输出完整 HTML 文档，从 <!DOCTYPE html> 或 <html> 开始到 </html> 结束。
2. CSS 放入 style，JavaScript 放入 script。
3. 功能必须真实可交互，不要输出 Markdown 代码块或解释文字。
4. 修改请求必须基于上一版 HTML 返回完整的新 HTML。
只输出纯 HTML。`;

export type GenerateHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateRequest = {
  prompt: string;
  projectId?: string;
  currentHtml: string;
  history: GenerateHistoryItem[];
};

export type GenerateParseResult =
  | { ok: true; value: GenerateRequest }
  | { ok: false; error: string };

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateProgressStage = "parsing";

export function parseGenerateRequest(input: unknown): GenerateParseResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "请求格式无效" };
  }

  const record = input as Record<string, unknown>;
  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";

  if (!prompt) {
    return { ok: false, error: "请输入生成需求" };
  }

  const history = Array.isArray(record.history)
    ? record.history
        .filter(isHistoryItem)
        .slice(-6)
        .map((item) => ({ ...item, content: item.content.slice(0, 2000) }))
    : [];

  return {
    ok: true,
    value: {
      prompt: prompt.slice(0, 4000),
      projectId: typeof record.projectId === "string" ? record.projectId : undefined,
      currentHtml: typeof record.currentHtml === "string" ? record.currentHtml.slice(0, 20000) : "",
      history,
    },
  };
}

function isHistoryItem(item: unknown): item is GenerateHistoryItem {
  if (!item || typeof item !== "object") return false;
  const record = item as Record<string, unknown>;
  return (record.role === "user" || record.role === "assistant") && typeof record.content === "string";
}

export function buildGenerateMessages(input: GenerateRequest): DeepSeekMessage[] {
  const messages: DeepSeekMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (input.currentHtml) {
    messages.push({ role: "user", content: `上一版 HTML：\n${input.currentHtml}` });
  }

  messages.push(...input.history.map((item) => ({ role: item.role, content: item.content })));
  messages.push({ role: "user", content: input.prompt });
  return messages;
}

export async function generateHtml(
  input: GenerateRequest,
  onProgress?: (stage: GenerateProgressStage) => void,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("服务端缺少 DEEPSEEK_API_KEY");
  }

  let lastError = "DeepSeek 请求失败";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.2,
          messages: buildGenerateMessages(input),
        }),
      });

      if (!response.ok) {
        lastError = `DeepSeek 返回 HTTP ${response.status}`;
        continue;
      }

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content || "";
      onProgress?.("parsing");
      const parsed = extractHtml(content);

      if (parsed.ok) return parsed.html;
      lastError = parsed.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  throw new Error(lastError);
}
