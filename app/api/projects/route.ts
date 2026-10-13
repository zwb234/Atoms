import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const result = await supabase
    .from("projects")
    .insert({ user_id: authData.user.id })
    .select("id,title,current_html,share_token,created_at,updated_at")
    .single();
  if (result.error || !result.data) {
    return NextResponse.json({ error: "新建项目失败" }, { status: 500 });
  }

  return NextResponse.json({ project: result.data }, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("id");
  if (projectId) {
    const projectResult = await supabase
      .from("projects")
      .select("id,user_id,title,current_html,share_token,created_at,updated_at")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single();
    if (projectResult.error || !projectResult.data) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const messagesResult = await supabase
      .from("messages")
      .select("id,role,content,html,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ project: projectResult.data, messages: messagesResult.data || [] });
  }

  const result = await supabase
    .from("projects")
    .select("id,title,current_html,share_token,created_at,updated_at")
    .eq("user_id", authData.user.id)
    .order("updated_at", { ascending: false });

  if (result.error) {
    return NextResponse.json({ error: "历史项目读取失败" }, { status: 500 });
  }

  return NextResponse.json({ projects: result.data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  const { id, title } = body as { id?: unknown; title?: unknown };
  const name = typeof title === "string" ? title.trim() : "";
  if (typeof id !== "string" || !id || !name || Array.from(name).length > 60) {
    return NextResponse.json({ error: "项目名称需为 1–60 个字符" }, { status: 400 });
  }

  const result = await supabase
    .from("projects")
    .update({ title: name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .select("id,title")
    .single();
  if (result.error || !result.data) {
    return NextResponse.json({ error: "项目不存在或改名失败" }, { status: 404 });
  }
  return NextResponse.json({ project: result.data });
}
