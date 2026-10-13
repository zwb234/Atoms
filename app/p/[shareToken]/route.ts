import { createSupabaseServerClient } from "../../../lib/supabase/server";

const notFound = () => new Response("项目不存在", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: { shareToken: string } },
) {
  const token = params.shareToken;
  if (!/^[0-9a-f]{64}$/.test(token)) return notFound();

  const supabase = await createSupabaseServerClient();
  const { data: html, error } = await supabase.rpc("get_shared_project_html", { token });
  if (error || typeof html !== "string" || !html.trim()) return notFound();

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, no-store",
    },
  });
}
