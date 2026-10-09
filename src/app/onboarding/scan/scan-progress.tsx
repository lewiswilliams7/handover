"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SignOutButton } from "@/app/onboarding/sign-out-button";

type ScanStatus = {
  status: "pending" | "syncing" | "complete" | "failed" | "claimed";
  scanOutcome: "findings" | "no_findings" | "metrics_suppressed" | "no_clients" | null;
  progress: { stage: string; completed: number; total: number | null };
  clientsAnalysed: number | null;
  findingsCount: Record<string, number> | null;
  exposureValue: number | null;
  exposureAvailability: string | null;
  errorCode: string | null;
};

const stages = [
  { key: "connected", label: "Connection validated" },
  { key: "tickets", label: "Reading historical tickets" },
  { key: "contracts", label: "Reading contracts and agreements" },
  { key: "complete", label: "Analysing delivery patterns" },
];

function stageIndex(stage: string): number {
  if (stage === "starting") return 0;
  if (stage === "tickets") return 1;
  if (stage === "contracts") return 2;
  if (stage === "complete") return 3;
  return 0;
}

function failureCopy(code: string | null) {
  switch (code) {
    case "no_clients":
      return {
        title: "There was nothing to analyse",
        body: "The connection worked, but no client-linked records were returned for this scan. Check that the API application can read client-linked tickets, then try again.",
      };
    case "metrics_suppressed":
      return {
        title: "The scan completed, but the data was too incomplete",
        body: "We found the PSA connection, but the available timestamps did not support a defensible delivery metric. We have not turned missing data into a misleading zero.",
      };
    case "upstream_forbidden":
      return {
        title: "The PSA blocked part of the scan",
        body: "The credentials authenticated, but a required read permission was refused during the scan. Review the read-only permissions in your PSA application and try again.",
      };
    case "session_expired":
      return {
        title: "The scan session expired",
        body: "For security, temporary credentials are held for one hour only. Start a new scan to continue.",
      };
    case "upstream_rate_limited":
      return {
        title: "The PSA asked us to slow down",
        body: "Your credentials were accepted, but the PSA rate-limited the scan before it could finish. Wait a few minutes and try again.",
      };
    case "sync_failed":
      return {
        title: "The scan stopped unexpectedly",
        body: "The connection was validated, but the PSA did not return a usable scan response. Try again, or use the walkthrough while you check the PSA logs.",
      };
    default:
      return {
        title: "The scan could not finish",
        body: "The connection was validated, but the PSA did not return all the data needed to complete the scan. No partial result is being presented as complete.",
      };
  }
}

export function ScanProgress() {
  const router = useRouter();
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [viewerEntitled, setViewerEntitled] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/scan-claim-redirect", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          detailsEntitled?: boolean;
        };
        if (response.ok) setViewerEntitled(data.detailsEntitled === true);
      })
      .catch(() => {
        // Anonymous users do not get an exit link.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const readStatus = async () => {
      try {
        const response = await fetch("/onboarding/scan/status", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as ScanStatus & { ok?: boolean };
        if (cancelled) return;
        setScan(data);
        setLoadError(false);
        if (
          data.status === "complete" &&
          data.scanOutcome !== "metrics_suppressed" &&
          data.scanOutcome !== "no_clients"
        ) {
          window.setTimeout(() => router.push("/onboarding/results"), 700);
        }
        if (
          data.scanOutcome === "no_clients" ||
          (data.status === "failed" && data.errorCode === "no_clients")
        ) {
          window.setTimeout(() => router.push("/onboarding/results"), 700);
        }
        if (data.status === "complete" || data.status === "claimed" || data.status === "failed") {
          window.clearInterval(interval);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };

    const interval = window.setInterval(() => void readStatus(), 2000);
    void readStatus();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router]);

  const activeStage = useMemo(
    () => stageIndex(scan?.progress.stage ?? "starting"),
    [scan?.progress.stage],
  );
  const failed = scan?.status === "failed";
  const nonCelebratoryOutcome =
    scan?.scanOutcome === "metrics_suppressed" || scan?.scanOutcome === "no_clients";
  const failure = failed || nonCelebratoryOutcome
    ? failureCopy(scan?.errorCode ?? scan?.scanOutcome)
    : null;

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center">
        <div className="mb-12 flex items-center justify-between gap-4">
          <Link href="/onboarding/connect" className="flex items-center gap-2 text-sm font-semibold">
            <Image src="/icon2.png" alt="" width={30} height={30} className="rounded-lg" />
            Handover
          </Link>
          <div className="flex items-center gap-4">
            {viewerEntitled ? (
              <a href="/onboarding/exit" className="text-xs font-semibold text-white/50 hover:text-white/80">
                Skip for now
              </a>
            ) : null}
            <SignOutButton />
          </div>
        </div>

        {loadError && !scan ? (
          <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-6" role="alert">
            <AlertCircle className="size-6 text-red-200" />
            <h1 className="mt-4 text-xl font-semibold">We could not read the scan status</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">Refresh this page or start a new scan.</p>
            <a href="/onboarding/connect" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
              Start again <ArrowRight className="size-4" />
            </a>
          </div>
        ) : (failed || nonCelebratoryOutcome) && failure ? (
          <div className="rounded-3xl border border-amber-200/20 bg-amber-200/[0.06] p-6 sm:p-8" role="status">
            <AlertCircle className="size-7 text-amber-200" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">Scan outcome</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{failure.title}</h1>
            <p className="mt-4 text-sm leading-7 text-white/60">{failure.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {nonCelebratoryOutcome ? (
                <a href="/onboarding/results" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
                  View honest scan summary <ArrowRight className="size-4" />
                </a>
              ) : (
                <a href="/onboarding/connect" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
                  Try another connection <ArrowRight className="size-4" />
                </a>
              )}
              <a href="/security" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70">
                <LockKeyhole className="size-4" /> Security
              </a>
            </div>
          </div>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Step 2 of 3</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">We&apos;re reading your PSA.</h1>
            <p className="mt-4 text-sm leading-7 text-white/60">
              This usually takes 20–60 seconds. Keep this tab open while we read the data and calculate only metrics we can support.
            </p>

            <div className="mt-10 space-y-4">
              {stages.map((item, index) => {
                const done = scan?.progress.stage === "complete" || activeStage > index;
                const current = !done && activeStage === index;
                return (
                  <div key={item.key} className="flex items-center gap-4">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
                      done ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200" :
                        current ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-200" :
                          "border-white/10 text-white/30"
                    }`}>
                      {done ? <CheckCircle2 className="size-4" /> : current ? <Loader2 className="size-4 animate-spin" /> : <span className="text-xs">{index + 1}</span>}
                    </span>
                    <span className={done || current ? "text-sm text-white" : "text-sm text-white/35"}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 border-t border-white/10 pt-5 text-xs text-white/40">
              {scan?.progress.total
                ? `Stage ${Math.min(scan.progress.completed + 1, scan.progress.total)} of ${scan.progress.total}`
                : "Preparing secure scan"}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
