export function makeProjectTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/gu, " ").trim();
  if (!normalized) return "未命名项目";
  const subject = normalized
    .replace(/^(?:请)?(?:帮我)?(?:做|创建|开发|生成|设计)(?:一个|一款|个)?/u, "")
    .trim();
  return Array.from(subject || normalized).slice(0, 30).join("");
}
