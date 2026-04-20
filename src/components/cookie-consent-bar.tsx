"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "handover-cookie-consent";

export function CookieConsentBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const v = window.localStorage.getItem(CONSENT_KEY);
    setVisible(v !== "accepted");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-[13px] text-[var(--text-secondary)]">
          We use essential cookies only to keep you signed in. No tracking or
          advertising cookies.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            size="sm"
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            onClick={() => {
              window.localStorage.setItem(CONSENT_KEY, "accepted");
              setVisible(false);
            }}
          >
            Accept
          </Button>
          <Link
            href="/privacy"
            className="px-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </div>
  );
}
