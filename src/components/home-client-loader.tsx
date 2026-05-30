"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/app/home-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: "#0f172a" }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#38bdf8]" />
    </div>
  ),
});

export function HomeClientLoader() {
  return <HomeClient />;
}
