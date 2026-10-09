"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OUTPUT_LANGUAGES = ["English", "French", "Dutch", "German", "Spanish"] as const;

type Props = {
  open: boolean;
  isTrial?: boolean;
  /** First name for welcome line; null → generic welcome */
  welcomeFirstName: string | null;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  outputLanguage: string;
  setOutputLanguage: (v: string) => void;
  onSaveProfile: () => Promise<void>;
  haloUrl: string;
  setHaloUrl: (v: string) => void;
  haloTenant: string;
  setHaloTenant: (v: string) => void;
  haloClientId: string;
  setHaloClientId: (v: string) => void;
  haloClientSecret: string;
  setHaloClientSecret: (v: string) => void;
  haloLoading: boolean;
  haloError: string | null;
  haloConnected: boolean;
  onHaloConnect: () => Promise<void>;
  onComplete: (choice: "example" | "paste") => void;
  onSkipEntirely: () => Promise<void>;
};

const enterAnim = "transition-transform duration-300 ease-out";

export function FirstRunOnboardingOverlay({
  open,
  isTrial,
  welcomeFirstName,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  jobTitle,
  setJobTitle,
  companyName,
  setCompanyName,
  outputLanguage,
  setOutputLanguage,
  onSaveProfile,
  haloUrl,
  setHaloUrl,
  haloTenant,
  setHaloTenant,
  haloClientId,
  setHaloClientId,
  haloClientSecret,
  setHaloClientSecret,
  haloLoading,
  haloError,
  haloConnected,
  onHaloConnect,
  onComplete,
  onSkipEntirely,
}: Props) {
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState<"in" | "out">("in");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSlide("in");
    }
  }, [open]);

  if (!open) return null;

  const go = (next: number) => {
    setSlide("out");
    setTimeout(() => {
      setStep(next);
      setSlide("in");
    }, 200);
  };

  const profileStepComplete =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    jobTitle.trim().length > 0 &&
    companyName.trim().length > 0;

  const haloStepHasInput = Boolean(haloUrl.trim() || haloClientId.trim() || haloClientSecret.trim());

  const dots = (
    <div className="mb-6 flex items-center justify-center gap-0">
      {[0, 1, 2].map((n, i) => (
        <div key={n} className="flex items-center">
          <div
            className={cn(
              "size-2.5 rounded-full transition-colors duration-300",
              step === n ? "bg-[var(--accent)]" : "bg-[var(--text-muted)] opacity-35",
            )}
            aria-current={step === n ? "step" : undefined}
          />
          {i < 2 ? (
            <div
              className="mx-1 h-px w-8 sm:w-12"
              style={{
                background:
                  step > n
                    ? "color-mix(in srgb, var(--accent) 55%, var(--border))"
                    : "var(--border)",
              }}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-contain p-4 py-10 md:overscroll-auto"
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <div
        className={cn(
          "w-full max-w-[560px] rounded-[var(--radius-lg)] border p-6 sm:p-8",
          enterAnim,
          slide === "in" ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0",
        )}
        style={{
          background: "color-mix(in srgb, var(--bg-secondary) 85%, transparent)",
          borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
          boxShadow: "0 0 64px -16px color-mix(in srgb, var(--accent) 40%, transparent)",
          backdropFilter: "blur(16px)",
        }}
      >
        {step === 1 ? (
          <h2 className="mb-4 text-center text-[17px] font-semibold text-[var(--text-primary)] sm:text-lg">
            {isTrial ? "Welcome to your 14-day trial! 🎉" : `Welcome${welcomeFirstName ? `, ${welcomeFirstName}` : ""}!`}
          </h2>
        ) : null}

        {dots}

        {step === 0 ? (
          <>
            <h2
              id="onboard-title"
              className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              Tell us about yourself
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
              This personalises every report Handover generates - your name and signature appear on all
              client outputs.
            </p>
            <div className="mt-6 space-y-3">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                First name
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Last name
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Job title
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Technical Project Manager"
                  required
                  autoComplete="organization-title"
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Company name
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your MSP name"
                  required
                  autoComplete="organization"
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Output language
                <select
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                >
                  {OUTPUT_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-[13px] text-[var(--text-secondary)]">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                Signature preview
              </p>
              <p>Kind regards,</p>
              <p className="font-medium text-[var(--text-primary)]">
                {firstName.trim() || "\u00a0"} {lastName.trim() || "\u00a0"}
              </p>
              <p>{jobTitle.trim() || "\u00a0"}</p>
              <p>{companyName.trim() || "\u00a0"}</p>
            </div>
            <Button
              type="button"
              className="mt-6 w-full bg-[var(--accent)] font-semibold text-white hover:bg-[var(--accent-hover)]"
              disabled={!profileStepComplete || profileSaving}
              onClick={() =>
                void (async () => {
                  if (!profileStepComplete || profileSaving) return;
                  setProfileSaving(true);
                  try {
                    await onSaveProfile();
                    go(1);
                  } catch {
                    /* save failed — stay on step */
                  } finally {
                    setProfileSaving(false);
                  }
                })()
              }
            >
              {profileSaving ? "Saving…" : "Continue →"}
            </Button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              Connect HaloPSA when you&apos;re ready
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Once you&apos;re connected, we pull live tickets for you - same workflow you already
              use, minus the Friday copy-paste marathon.
            </p>
            <div className="mt-6 space-y-3">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                HaloPSA URL
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={haloUrl}
                  onChange={(e) => setHaloUrl(e.target.value)}
                  placeholder="https://yourcompany.halopsa.com"
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Tenant (optional)
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={haloTenant}
                  onChange={(e) => setHaloTenant(e.target.value)}
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Client ID
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={haloClientId}
                  onChange={(e) => setHaloClientId(e.target.value)}
                />
              </label>
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Client secret
                <input
                  type="password"
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
                  value={haloClientSecret}
                  onChange={(e) => setHaloClientSecret(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {haloError ? (
                <p className="text-[13px] text-[var(--danger)]">{haloError}</p>
              ) : null}
              {haloConnected ? (
                <p className="text-[13px] font-medium text-[var(--success)]">
                  You&apos;re connected - nice one ✓
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="self-end text-[12px] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline sm:self-center"
                onClick={() => void onSkipEntirely()}
              >
                I&apos;ll skip setup for now
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  type="button"
                  className="bg-[var(--accent)] font-semibold text-white hover:bg-[var(--accent-hover)]"
                  disabled={haloLoading}
                  onClick={() =>
                    void (async () => {
                      await onHaloConnect();
                    })()
                  }
                >
                  Connect HaloPSA →
                </Button>
                <Button type="button" variant="outline" onClick={() => go(2)}>
                  {haloStepHasInput ? "Next →" : "Skip →"}
                </Button>
              </div>
            </div>
            {haloConnected ? (
              <Button type="button" className="mt-3 w-full" variant="secondary" onClick={() => go(2)}>
                Continue →
              </Button>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              You&apos;re all set - want to see it in action?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Drop in your own notes, or try a realistic example - whatever feels easier right now.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-primary))] p-5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                onClick={() => onComplete("example")}
              >
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                  Show me an example →
                </p>
                <p className="mt-2 text-[13px] leading-snug text-[var(--text-secondary)]">
                  We&apos;ll use sample MSP ticket data so you can see the outputs instantly.
                </p>
              </button>
              <button
                type="button"
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]"
                onClick={() => onComplete("paste")}
              >
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                  I&apos;ll paste my own notes →
                </p>
                <p className="mt-2 text-[13px] leading-snug text-[var(--text-secondary)]">
                  Use a real meeting note or ticket dump from your week.
                </p>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
