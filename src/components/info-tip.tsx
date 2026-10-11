"use client";

import { CircleHelp } from "lucide-react";
import { useId, useState } from "react";

/**
 * A small "?" that explains a number in plain English: what it is and why it
 * matters. Opens on hover, keyboard focus or tap; Escape closes it.
 */
export function InfoTip({ label, children, align = "left" }: { label: string; children: React.ReactNode; align?: "left" | "right" }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="relative z-10 inline-flex min-h-0 items-center rounded-full p-0.5 text-[var(--text-muted)] transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-6 z-30 w-64 rounded-xl border border-white/15 bg-[#0f1a2e] p-3 text-left text-xs font-normal normal-case leading-5 tracking-normal text-[var(--text-secondary)] shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
