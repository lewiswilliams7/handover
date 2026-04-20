"use client";

import { useCallback, useEffect, useState } from "react";

import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getReferralLink } from "@/lib/referral";
import { cn } from "@/lib/utils";

type ReferralRow = {
  id: string;
  referred_email: string | null;
  status: string;
  created_at: string;
  reward_applied_at: string | null;
};

type DashboardPayload = {
  code: string | null;
  clickCount: number;
  stats: {
    clicked: number;
    signedUp: number;
    converted: number;
    earned: number;
  };
  referrals: ReferralRow[];
};

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "signed_up":
      return "Signed up";
    case "converted":
      return "Converted";
    case "rewarded":
      return "Rewarded";
    default:
      return status;
  }
}

type Props = {
  hasProAccess: boolean;
  onStartCheckout: (priceId: string) => void;
  checkoutLoading: boolean;
  focusRing: string;
};

export function ReferralsSettingsPanel({
  hasProAccess,
  onStartCheckout: _onStartCheckout,
  checkoutLoading: _checkoutLoading,
  focusRing,
}: Props) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const load = useCallback(async () => {
    if (!hasProAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/referrals/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hasProAccess]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = useCallback(async () => {
    const code = data?.code?.trim();
    if (!code) return;
    const link = getReferralLink(code);
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      /* ignore */
    }
  }, [data?.code]);

  const shareLinkedIn = useCallback(() => {
    const code = data?.code?.trim();
    if (!code) return;
    const link = getReferralLink(code);
    const text = `I've been using Handover to automate my MSP reporting - saves me hours every week.\nTry it free: ${link}`;
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [data?.code]);

  if (!hasProAccess) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-secondary)] p-6"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex size-[72px] items-center justify-center">
            <div
              className="absolute inset-0 rounded-full opacity-90 blur-2xl"
              style={{ background: "color-mix(in srgb, var(--accent) 35%, transparent)" }}
              aria-hidden
            />
            <Lock
              className="relative size-11 text-[var(--accent)]"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            Refer &amp; Earn £105 per referral
          </h3>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--text-muted)]">
            Upgrade to Pro to access the referral programme and start earning £105 for every MSP you
            refer to Handover.
          </p>
          <div
            className="mt-6 w-full max-w-md select-none rounded-[var(--radius)] border border-[var(--border)]/60 bg-[var(--bg-primary)]/40 p-4 text-left opacity-40 pointer-events-none"
            aria-hidden
          >
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">How it works</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] text-[var(--text-secondary)]">
              <li>Share your link with MSP delivery teams</li>
              <li>They sign up and try Handover free for their first month</li>
              <li>When they subscribe, you earn £105 (3 months free)</li>
            </ol>
          </div>
          <Link
            href="/pricing"
            className={cn(
              "mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]",
              focusRing,
            )}
          >
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        {loading ? "Loading referrals…" : "Could not load referral data."}
      </p>
    );
  }

  const link = data.code?.trim() ? getReferralLink(data.code.trim()) : "";
  const hasRows = data.referrals.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Refer &amp; Earn</h3>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Earn £105 for every MSP you refer to Handover.
        </p>
      </div>

      <div
        className="rounded-[var(--radius-lg)] border border-[var(--accent)]/40 bg-[var(--bg-secondary)] p-4"
        style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)" }}
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Your referral link
        </p>
        {link ? (
          <>
            <p className="mt-2 break-all font-mono text-[12px] text-[var(--text-primary)]">{link}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("border-[var(--border)] text-[12px]", focusRing)}
                onClick={() => void copyLink()}
              >
                {copyState === "copied" ? "Copied!" : "Copy link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("border-[var(--border)] text-[12px]", focusRing)}
                onClick={shareLinkedIn}
              >
                Share on LinkedIn
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            Your code will appear here after your first successful Pro or Team subscription checkout.
          </p>
        )}
      </div>

      <div>
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">How it works</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] text-[var(--text-secondary)]">
          <li>Share your link with MSP delivery teams</li>
          <li>They sign up and try Handover free for their first month</li>
          <li>When they subscribe, you earn £105 (3 months free)</li>
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Links clicked", String(data.stats.clicked)],
            ["Signed up", String(data.stats.signedUp)],
            ["Converted", String(data.stats.converted)],
            ["Earned", `£${data.stats.earned}`],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5"
          >
            <p className="text-[20px] font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[12px] font-semibold text-[var(--text-primary)]">Your referrals</p>
        {!hasRows ? (
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            No referrals yet. Share your link to start earning.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
            <table className="w-full min-w-[420px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <th className="px-3 py-2 font-semibold text-[var(--text-muted)]">Email</th>
                  <th className="px-3 py-2 font-semibold text-[var(--text-muted)]">Status</th>
                  <th className="px-3 py-2 font-semibold text-[var(--text-muted)]">Date</th>
                  <th className="px-3 py-2 font-semibold text-[var(--text-muted)]">Reward</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-3 py-2 text-[var(--text-primary)]">
                      {r.referred_email ?? " - "}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {statusLabel(r.status)}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {r.status === "rewarded" ? "£105" : " - "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
