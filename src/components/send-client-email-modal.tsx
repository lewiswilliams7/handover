"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/toasts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildRawClientEmailBodyHtml } from "@/lib/scheduled-report-email";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTo: string;
  initialSubject: string;
  textBody: string;
};

export function SendClientEmailModal({
  open,
  onOpenChange,
  initialTo,
  initialSubject,
  textBody,
}: Props) {
  const toast = useToast();
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [ccBccOpen, setCcBccOpen] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [sending, setSending] = useState(false);
  const fieldsRef = useRef({ to, cc, bcc, subject, textBody });
  fieldsRef.current = { to, cc, bcc, subject, textBody };

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setSubject(initialSubject);
      setCc("");
      setBcc("");
      setCcBccOpen(false);
      setSending(false);
    }
  }, [open, initialTo, initialSubject]);

  const previewHtml = useMemo(() => buildRawClientEmailBodyHtml(textBody), [textBody]);

  async function performSend() {
    const { to: t, cc: c, bcc: b, subject: s, textBody: body } = fieldsRef.current;
    setSending(true);
    try {
      const res = await fetch("/api/generation/send-client-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          to: t.trim(),
          cc: c.trim(),
          bcc: b.trim(),
          subject: s.trim(),
          textBody: body,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Could not send email.";
        toast({
          message: msg,
          variant: "error",
          action: {
            label: "Try again",
            onClick: () => {
              void performSend();
            },
          },
        });
        return;
      }
      toast({ message: "Email sent successfully", durationMs: 3200 });
      onOpenChange(false);
    } catch {
      toast({
        message: "Could not send email.",
        variant: "error",
        action: {
          label: "Try again",
          onClick: () => {
            void performSend();
          },
        },
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="shrink-0 border-b border-[var(--border)] px-4 py-3 sm:px-5">
          <DialogTitle>Send email</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-1.5">
            <label htmlFor="send-client-email-to" className="text-sm font-medium text-[var(--text-primary)]">
              To (comma-separated for multiple)
            </label>
            <Input
              id="send-client-email-to"
              type="text"
              autoComplete="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@example.com, pm@msp.com"
            />
            <button
              type="button"
              className="text-left text-[13px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
              onClick={() => setCcBccOpen((o) => !o)}
            >
              {ccBccOpen ? "− Hide CC/BCC" : "+ Add CC/BCC"}
            </button>
            {ccBccOpen ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="send-client-email-cc" className="text-sm font-medium text-[var(--text-primary)]">
                    CC (optional)
                  </label>
                  <Input
                    id="send-client-email-cc"
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Comma-separated addresses"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="send-client-email-bcc" className="text-sm font-medium text-[var(--text-primary)]">
                    BCC (optional)
                  </label>
                  <Input
                    id="send-client-email-bcc"
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Comma-separated addresses"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="send-client-email-subject"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Subject
            </label>
            <Input
              id="send-client-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Project Update - …"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-[var(--text-primary)]">Preview</p>
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[#f8fafc] dark:bg-[var(--bg-secondary)]">
              <iframe
                title="Email preview"
                className="h-[min(280px,40vh)] w-full border-0 bg-white"
                srcDoc={previewHtml}
              />
            </div>
            <p className="text-[11px] leading-snug text-[var(--text-muted)]">
              This email will be sent from noreply@gethandover.uk - we recommend adding this to
              your safe senders list.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            disabled={sending || !to.trim() || !subject.trim() || !textBody.trim()}
            onClick={() => void performSend()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
