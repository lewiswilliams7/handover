"use client";

import { Check, ChevronDown, Copy, Loader2, Mail, Send } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { buildSavePlayEmail, getSavePlay, playHasEmail } from "@/lib/save-plays";

type Props = {
  findingType: string;
  clientName: string;
  senderName: string;
  /** Records the play as done; the finding leaves the list and is tracked for Saved Revenue. */
  onComplete: (note: string) => Promise<void>;
};

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; to: string }
  | { kind: "error"; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Save Play™ for one finding: the steps to take, a ready-to-send email to the
 * client's decision-maker, and a way to record that the play was run.
 */
export function SavePlayPanel({ findingType, clientName, senderName, onComplete }: Props) {
  const play = getSavePlay(findingType);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const initialEmail = useMemo(
    () => (play ? buildSavePlayEmail(play, { clientName, senderName }) : null),
    [play, clientName, senderName],
  );
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(initialEmail?.subject ?? "");
  const [body, setBody] = useState(initialEmail?.body ?? "");
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!play) return null;
  const hasEmail = playHasEmail(play);
  const toValid = EMAIL_PATTERN.test(to.trim());

  const send = async () => {
    if (!toValid || sendState.kind === "sending") return;
    setSendState({ kind: "sending" });
    try {
      const response = await fetch("/api/action-email/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, body, clientName }),
      });
      if (!response.ok) {
        setSendState({
          kind: "error",
          message:
            response.status === 400
              ? "Check the email address and try again."
              : "The email was not sent. Try again, or copy it into your own email app.",
        });
        return;
      }
      setSendState({ kind: "sent", to: to.trim() });
    } catch {
      setSendState({
        kind: "error",
        message: "Handover could not be reached. Copy the email into your own email app instead.",
      });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const mailtoHref = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const complete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await onComplete(
        sendState.kind === "sent"
          ? `Save Play: ${play.title}. Email sent to ${sendState.to}.`
          : `Save Play: ${play.title}.`,
      );
    } finally {
      setCompleting(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-cyan-300/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-cyan-200">Save Play</span>
          <span className="mt-0.5 block text-sm font-semibold text-white">{play.title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">{play.why}</span>
        </span>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-200">
          {open ? "Hide" : "Open play"}
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-cyan-300/15 px-4 pb-4 pt-3">
          <ol className="space-y-2">
            {play.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-[var(--text-primary)]">
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 text-[11px] font-semibold text-cyan-200"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {hasEmail ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-black/15 p-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Email to {clientName}&apos;s decision-maker
              </p>
              <div className="mt-3 space-y-2">
                <label className="block">
                  <span className="sr-only">Recipient email</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      if (sendState.kind === "error") setSendState({ kind: "idle" });
                    }}
                    placeholder="Who should receive this? name@client.com"
                    className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Subject</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    maxLength={300}
                    className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Email body</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={9}
                    className="w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!toValid || sendState.kind === "sending" || sendState.kind === "sent"}
                  className="inline-flex items-center gap-1.5 rounded-md bg-cyan-300 px-3 py-1.5 font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendState.kind === "sending" ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : sendState.kind === "sent" ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Send className="size-3.5" aria-hidden />
                  )}
                  {sendState.kind === "sent" ? "Sent" : "Send email"}
                </button>
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
                >
                  {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a
                  href={mailtoHref}
                  className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white"
                >
                  <Mail className="size-3.5" aria-hidden /> Open in email app
                </a>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]" role="status" aria-live="polite">
                {sendState.kind === "sent"
                  ? `Sent to ${sendState.to}. Replies come to you. Mark the play as done once you have spoken to them.`
                  : sendState.kind === "error"
                    ? sendState.message
                    : "Sent from Handover under your company name. Replies come straight to you."}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              Marking the play done moves this to History. If a later scan shows the signal has
              cleared, the client counts towards your Saved Revenue.
            </p>
            <button
              type="button"
              onClick={() => void complete()}
              disabled={completing}
              className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-300/10 disabled:cursor-wait disabled:opacity-60"
            >
              {completing ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
              Mark play done
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
