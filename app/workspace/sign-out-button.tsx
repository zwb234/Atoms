"use client";

import React, { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (!error) {
      window.location.assign("/login");
    }
    setBusy(false);
  }

  return (
    <button className="workspace-signout" type="button" onClick={signOut} disabled={busy}>
      {busy ? "退出中…" : "退出登录"}
    </button>
  );
}
