"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PENDING_TRIAL_STORAGE_KEY, parseTrialQueryParam } from "@/lib/auth/trial-query";
import { createClient } from "@/lib/supabase";

function notifyProfileReload() {
  try {
    window.dispatchEvent(new Event("handover:profile-reload"));
  } catch {
    /* ignore */
  }
}

/**
 * After OAuth/email flows, `?trial=` may be missing on the landing URL. Auth form stores
 * {@link PENDING_TRIAL_STORAGE_KEY} before redirect; we POST `/api/trial/start` once session exists.
 */
export function TrialAutoStartFromPendingStorage() {
  const pathname = usePathname();
  const router = useRouter();
  const inFlightRef = useRef(false);

  useEffect(() => {
    // Don't auto-start on welcome page — user is choosing their plan
    if (pathname === "/welcome") return;
    const run = async () => {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(PENDING_TRIAL_STORAGE_KEY);
      } catch {
        return;
      }
      const trial = parseTrialQueryParam(raw);
      if (!trial) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const doneKey = `trial_autostart_ok:${user.id}:${trial}`;
      try {
        if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(doneKey)) {
          try {
            localStorage.removeItem(PENDING_TRIAL_STORAGE_KEY);
          } catch {
            /* ignore */
          }
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
            localStorage.removeItem(PENDING_TRIAL_STORAGE_KEY);
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
  }, [router, pathname]);

  return null;
}
