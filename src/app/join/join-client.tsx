"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [phase, setPhase] = useState<"loading" | "ready" | "joining" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const joinStartedRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (!token) {
      setPhase("error");
      setError("Missing invite token. Use the link from your email.");
      return;
    }
    joinStartedRef.current = false;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSignedIn(Boolean(user));
    setPhase("ready");
  }, [token]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const join = useCallback(async () => {
    if (!token) return;
    setPhase("joining");
    setError(null);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error?: string; team?: { name?: string } };
      if (!res.ok) {
        const msg = data.error ?? "Could not join team.";
        if (
          typeof msg === "string" &&
          msg.toLowerCase().includes("already a member")
        ) {
          setPhase("done");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 2000);
          return;
        }
        joinStartedRef.current = false;
        setPhase("error");
        setError(msg);
        return;
      }
      setPhase("done");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch {
      joinStartedRef.current = false;
      setPhase("error");
      setError("Something went wrong. Try again.");
    }
  }, [token, router]);

  useEffect(() => {
    if (phase === "ready" && signedIn && token && !joinStartedRef.current) {
      joinStartedRef.current = true;
      void join();
    }
  }, [phase, signedIn, token, join]);

  const returnTo = `/join?token=${encodeURIComponent(token)}`;

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center animate-in fade-in zoom-in-95 duration-200">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Invalid link</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-[var(--accent)] underline">
          Back to Handover
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Could not join</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
        {!signedIn ? (
          <div className="mt-8 flex flex-col gap-2">
            <Link
              href={`/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Sign in
            </Link>
            <Link
              href={`/auth?tab=signup&returnTo=${encodeURIComponent(returnTo)}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              Create account
            </Link>
          </div>
        ) : (
          <Button className="mt-6" variant="outline" onClick={() => void checkSession()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center animate-in fade-in zoom-in-95 duration-200">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Welcome to the team</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Redirecting to your dashboard…
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center animate-in fade-in zoom-in-95 duration-200">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Join your team</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sign in or create an account to accept this invitation. Your invite link is valid for 7
          days.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Link
            href={`/auth?tab=signin&returnTo=${encodeURIComponent(returnTo)}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Sign in
          </Link>
          <Link
            href={`/auth?tab=signup&returnTo=${encodeURIComponent(returnTo)}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
      <Loader2 className="size-8 animate-spin" aria-hidden />
      <p className="text-sm">Joining team…</p>
    </div>
  );
}
