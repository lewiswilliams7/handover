"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { shouldDeferTrialAutoStartForWelcomeChoice } from "@/lib/auth/trial-auto-start-defer-welcome";
import { parseTrialQueryParam } from "@/lib/auth/trial-query";
import { createClient } from "@/lib/supabase";

function notifyProfileReload() {
  try {
    window.dispatchEvent(new Event("handover:profile-reload"));
  } catch {
    /* ignore */
  }
}

/**
 * When the URL contains `?trial=professional` or `?trial=team` and the user is signed in,
 * POST to `/api/trial/start` once, then remove the query param.
 */
export function TrialAutoStartFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Don't auto-start on welcome page — user is choosing their plan
    if (pathname === "/welcome") return;
    const trial = parseTrialQueryParam(searchParams.get("trial"));
    if (!trial) return;

    const stripTrialFromUrl = () => {
      if (!searchParams.get("trial")) return;
      const p = new URLSearchParams(searchParams.toString());
      p.delete("trial");
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    };

    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      if (await shouldDeferTrialAutoStartForWelcomeChoice(supabase, user)) {
        router.replace("/welcome");
        return;
      }

      const doneKey = `trial_autostart_ok:${user.id}:${trial}`;
      try {
        if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(doneKey)) {
          stripTrialFromUrl();
          return;
        }
      } catch {
        /* ignore */
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await fetch("/api/trial/start", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: trial }),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (res.ok && data.ok) {
          try {
            sessionStorage.setItem(doneKey, "1");
          } catch {
            /* ignore */
          }
          notifyProfileReload();
          router.refresh();
        }
      } catch {
        /* ignore */
      } finally {
        inFlightRef.current = false;
        stripTrialFromUrl();
      }
    };

    void run();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void run();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, pathname, router]);

  return null;
}
