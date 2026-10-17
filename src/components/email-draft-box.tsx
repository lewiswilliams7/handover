"use client";

import { Check, Copy, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";

import { ContactSuggestions } from "@/components/contact-suggestions";
import type { ClientContact } from "@/lib/psa/scan-session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendState = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; to: string } | { kind: "error"; message: string };

/**
 * An editable email to a client: send from Handover under the MSP's name,
 * copy it, or open it in the user's own email app. Replies go to the user.
 */
export function EmailDraftBox({
  clientName,
  subject: initialSubject,
  body: initialBody,
  contacts,
  onSent,
}: {
  clientName: string;
  subject: string;
  body: string;
  contacts?: ClientContact[] | null;
  onSent?: (to: string) => void;
}) {
  const [to, setTo] = useState(contacts?.[0]?.email ?? "");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const toValid = EMAIL_PATTERN.test(to.trim());

  async function send() {
    if (!toValid || sendState.kind === "sending") return;
    setSendState({ kind: "sending" });
    const response = await fetch("/api/action-email/send", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.trim(), subject, body, clientName }),
    }).catch(() => null);
    if (!response?.ok) {
      setSendState({
        kind: "error",
        message:
          response?.status === 400
            ? "Check the email address and try again."
            : "The email was not sent. Try again, or copy it into your own email app.",
      });
      return;
    }
    setSendState({ kind: "sent", to: to.trim() });
    onSent?.(to.trim());
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const mailtoHref = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <div className="space-y-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          aria-label="Recipient email"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            if (sendState.kind === "error") setSendState({ kind: "idle" });
          }}
          placeholder="Who should receive this? name@client.com"
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
        />
        <ContactSuggestions contacts={contacts} current={to} onPick={setTo} />
        <input
          aria-label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={300}
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white outline-none focus:border-cyan-300/50"
        />
        <textarea
          aria-label="Email body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={11}
          className="w-full resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
        />
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
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white">
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={mailtoHref} className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-white">
          <Mail className="size-3.5" aria-hidden /> Open in email app
        </a>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]" role="status" aria-live="polite">
        {sendState.kind === "sent"
          ? `Sent to ${sendState.to}. Replies come to you.`
          : sendState.kind === "error"
            ? sendState.message
            : "Sent from Handover under your company name. Replies come straight to you."}
      </p>
    </div>
  );
}
