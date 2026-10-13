import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { generateHtml, parseGenerateRequest, type GenerateRequest } from "../../../lib/ai/generate";
import { makeProjectTitle } from "../../../lib/projects/title";

async function saveGeneratedApp(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  input: GenerateRequest,
  html: string,
) {
  let projectId = input.projectId;
  let shareToken: string;

  if (!projectId) {
    const created = await supabase
      .from("projects")
      .insert({ user_id: userId, title: makeProjectTitle(input.prompt), current_html: html })
      .select("id,share_token")
      .single();
    if (created.error || !created.data) throw new Error("项目保存失败");
    projectId = created.data.id;
    shareToken = created.data.share_token;
  } else {
    const existing = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();
    if (existing.error || !existing.data) throw new Error("项目不存在");
    const title = existing.data.title === "未命名项目" ? makeProjectTitle(input.prompt) : undefined;
    const updated = await supabase
      .from("projects")
      .update({ current_html: html, updated_at: new Date().toISOString(), ...(title ? { title } : {}) })
      .eq("id", projectId)
      .eq("user_id", userId)
      .select("share_token")
      .single();
    if (updated.error || !updated.data) throw new Error("项目更新失败");
    shareToken = updated.data.share_token;
  }

  const messageResult = await supabase.from("messages").insert([
    { project_id: projectId, role: "user", content: input.prompt },
    { project_id: projectId, role: "assistant", content: "已生成页面", html },
  ]);
  if (messageResult.error) throw new Error("消息保存失败");

  return { projectId, shareToken, html };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.value;

  const wantsStream = request.headers.get("accept")?.includes("text/event-stream");
  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        send({ stage: "generating" });
        void (async () => {
          try {
            const html = await generateHtml(input, (stage) => send({ stage }));
            send({ stage: "saving" });
            send({ stage: "success", ...await saveGeneratedApp(supabase, authData.user.id, input, html) });
          } catch (error) {
            send({ stage: "error", error: error instanceof Error ? error.message : "生成失败，请稍后重试" });
          } finally {
            controller.close();
          }
        })();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  }

  try {
    const html = await generateHtml(input);
    return NextResponse.json(await saveGeneratedApp(supabase, authData.user.id, input, html));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败，请稍后重试" },
      { status: 502 },
    );
  }
}
