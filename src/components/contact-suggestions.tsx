"use client";

import type { ClientContact } from "@/lib/psa/scan-session";

/**
 * The client's most active contacts from recent tickets, as one-tap chips
 * under an email field. They are suggestions: the most active person is not
 * always the decision-maker, so the address stays editable.
 */
export function ContactSuggestions({
  contacts,
  current,
  onPick,
}: {
  contacts: ClientContact[] | null | undefined;
  current: string;
  onPick: (email: string) => void;
}) {
  if (!contacts || contacts.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-[var(--text-muted)]">From recent tickets:</span>
      {contacts.map((contact) => {
        const active = contact.email === current.trim().toLowerCase();
        return (
          <button
            key={contact.email}
            type="button"
            onClick={() => onPick(contact.email)}
            title={`${contact.email} · raised ${contact.tickets} ticket${contact.tickets === 1 ? "" : "s"} in the last six months`}
            className={`min-h-0 rounded-full border px-2.5 py-0.5 transition-colors ${
              active
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                : "border-white/15 text-[var(--text-secondary)] hover:border-white/30 hover:text-white"
            }`}
          >
            {contact.name ?? contact.email}
          </button>
        );
      })}
    </div>
  );
}
