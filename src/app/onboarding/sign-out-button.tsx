"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setSignedIn(Boolean(user));
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!signedIn) return null;

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 transition-colors hover:text-white/85 disabled:cursor-wait disabled:opacity-60"
    >
      <LogOut className="size-3.5" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
