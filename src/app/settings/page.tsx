"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?openSettings=1");
  }, [router]);
  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ background: "#0f172a" }}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#38bdf8]" />
    </div>
  );
}
