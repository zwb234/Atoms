import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import SignOutButton from "./sign-out-button";
import WorkspaceClient from "./workspace-client";

export default async function WorkspacePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return <div className="workspace-page">
    <div className="workspace-nav">
      <a className="brand" href="/"><span className="brand-mark">✦</span> Atoms</a>
      <div className="workspace-user"><span>{data.user.email}</span><SignOutButton /></div>
    </div>
    <WorkspaceClient email={data.user.email || ""} />
  </div>;
}
