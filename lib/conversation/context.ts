import type { GenerateHistoryItem, GenerateRequest } from "../ai/generate";

export function buildIterationRequest(
  projectId: string,
  currentHtml: string,
  history: GenerateHistoryItem[],
  prompt: string,
): GenerateRequest {
  return {
    projectId,
    currentHtml: currentHtml.slice(0, 20000),
    history: history.slice(-6).map((item) => ({
      role: item.role,
      content: item.content.slice(0, 2000),
    })),
    prompt: prompt.trim().slice(0, 4000),
  };
}
