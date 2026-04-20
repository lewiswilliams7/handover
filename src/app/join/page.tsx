import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { JoinClient } from "./join-client";

export default function JoinPage() {
  return (
    <div
      className="min-h-screen animate-in fade-in duration-300 bg-[var(--bg-secondary)]"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 60%), var(--bg-secondary)",
      }}
    >
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
            <Loader2 className="size-8 animate-spin" aria-hidden />
          </div>
        }
      >
        <JoinClient />
      </Suspense>
    </div>
  );
}
