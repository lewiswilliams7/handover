"use client";

/**
 * Coded replicas of the real Handover screens, for marketing pages. They use
 * the same layout, wording and colours as the app, with invented clients, so
 * what a prospect sees here is what they get. Crisp at any size, no images.
 *
 * Decorative: each mock is aria-hidden behind a plain-English label.
 */
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ frame */

export function AppFrame({
  path,
  children,
  className,
  label,
}: {
  path: string;
  children: React.ReactNode;
  className?: string;
  /** What the picture shows, for screen readers. */
  label: string;
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0b1322] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(56,189,248,0.06)]",
        className,
      )}
    >
      <div aria-hidden className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate rounded-md bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-white/45">
          app.gethandover.uk{path}
        </span>
      </div>
      <div aria-hidden>{children}</div>
    </figure>
  );
}

function Tag({ tone, children }: { tone: "strong" | "soft" | "new" | "time"; children: React.ReactNode }) {
  const cls =
    tone === "strong"
      ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
      : tone === "new"
        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
        : tone === "time"
          ? "border-white/15 bg-white/[0.04] text-white/60"
          : "border-white/15 text-white/45";
  return <span className={`whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-medium ${cls}`}>{children}</span>;
}

/* ------------------------------------------------------------- This week */

type WeekRowMock = {
  client: string;
  value: string;
  why: string;
  detail: string;
  action: string;
  tags: Array<{ tone: "strong" | "soft" | "new" | "time"; text: string }>;
};

const WEEK_ROWS: WeekRowMock[] = [
  {
    client: "Carter & Lowe Solicitors",
    value: "£31,200",
    why: "Ticket activity dropped",
    detail: "3 tickets a month, against a usual 11. Normally 7 to 15.",
    action: "Re-engage a quiet client",
    tags: [
      { tone: "strong", text: "Strong sign" },
      { tone: "time", text: "Renews in 41 days" },
    ],
  },
  {
    client: "Westfield Manufacturing",
    value: "£46,800",
    why: "First response time changed",
    detail: "Typically 5 hr, against 1 hr over the last year.",
    action: "Reset response times",
    tags: [{ tone: "new", text: "New this week" }],
  },
  {
    client: "Ashby Primary Trust",
    value: "£22,800",
    why: "Contract ends in 58 days on a thin margin",
    detail: "",
    action: "Send the price-rise letter",
    tags: [],
  },
  {
    client: "Northgate Dental Group",
    value: "£14,400",
    why: "Has not opened the last 3 Value Receipts",
    detail: "",
    action: "Call them instead",
    tags: [],
  },
];

/**
 * The This week list, playing its one moment: rows arrive in ranked order,
 * the top one is marked handled and moves off, and Handover notes what it
 * learned. Static (all rows, no motion) when reduced motion is on.
 */
export function WeekListMock({ compact = false, autoplay = true }: { compact?: boolean; autoplay?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [handled, setHandled] = useState(false);
  const animate = autoplay && !reduce;

  useEffect(() => {
    if (!animate || !inView) return;
    const timer = window.setTimeout(() => setHandled(true), 2600);
    return () => window.clearTimeout(timer);
  }, [animate, inView]);

  const rows = handled ? WEEK_ROWS.slice(1) : WEEK_ROWS;
  const count = rows.length === 4 ? "Four" : "Three";

  return (
    <div ref={ref} className={cn("p-4 sm:p-5", compact && "p-3 sm:p-4")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">This week</p>
      <p className="mt-1 text-[15px] font-semibold tracking-tight text-white sm:text-lg">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={count}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {count} things need you this week.
          </motion.span>
        </AnimatePresence>
      </p>
      <ol className="mt-3 space-y-2">
        <AnimatePresence initial={animate} mode="popLayout">
          {rows.slice(0, compact ? 3 : 4).map((row, index) => (
            <motion.li
              key={row.client}
              layout={animate}
              initial={animate ? { opacity: 0, y: 14 } : false}
              animate={inView || !animate ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.35 } }}
              transition={{ duration: 0.45, delay: animate && !handled ? 0.15 + index * 0.12 : 0, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-2.5 sm:p-3"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                    index === 0 && !handled && inView
                      ? "border-emerald-300/50 text-emerald-200"
                      : "border-white/20 text-white/55",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12.5px] font-semibold text-white">{row.client}</span>
                      {row.tags.map((tag) => (
                        <Tag key={tag.text} tone={tag.tone}>
                          {tag.text}
                        </Tag>
                      ))}
                    </span>
                    <span className="text-[11.5px] text-white/55">
                      <span className="font-semibold text-white">{row.value}</span> a year
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-white/85">{row.why}</p>
                  {row.detail && !compact ? <p className="mt-0.5 text-[10.5px] text-white/40">{row.detail}</p> : null}
                  <p className="mt-1.5 text-[11px] font-semibold text-cyan-200">{row.action}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <AnimatePresence>
        {handled ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-2.5 flex items-start gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-[11px] text-emerald-100"
          >
            <Check className="mt-px size-3.5 shrink-0" />
            <span>
              Carter &amp; Lowe marked handled. Handover checks next week whether it cleared, and counts it in Saved
              Revenue if it did.
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------- Revenue at Risk */

function useCountUp(target: number, run: boolean, duration = 1100): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!run || reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, target, duration, reduce]);
  return reduce ? target : value;
}

const RISK_ROWS = [
  { client: "Westfield Manufacturing", value: "£46,800", reason: "First response slowed from 1 hr to 5 hr", spark: [3, 3, 4, 3, 4, 9, 14, 15] },
  { client: "Carter & Lowe Solicitors", value: "£31,200", reason: "Ticket activity fell by two thirds", spark: [11, 12, 10, 11, 9, 5, 3, 3] },
  { client: "Ashby Primary Trust", value: "£22,800", reason: "Open backlog doubled in three months", spark: [4, 5, 4, 5, 6, 8, 10, 11] },
];

function Spark({ points, tone }: { points: number[]; tone: string }) {
  const max = Math.max(...points);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 60},${22 - (p / max) * 18}`).join(" ");
  return (
    <svg viewBox="0 0 60 24" className={cn("h-5 w-14 shrink-0", tone)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RiskMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const total = useCountUp(100800, inView);
  return (
    <div ref={ref} className="p-5">
      <p className="text-[11px] text-white/50">Revenue at Risk</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-white tabular-nums">
        £{total.toLocaleString("en-GB")}
        <span className="text-base font-medium text-white/40"> a year</span>
      </p>
      <p className="mt-1 text-[11.5px] text-white/45">Held by 3 clients whose service or relationship changed</p>
      <ul className="mt-4 divide-y divide-white/[0.07] border-t border-white/[0.07]">
        {RISK_ROWS.map((row) => (
          <li key={row.client} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-white">{row.client}</p>
              <p className="truncate text-[11px] text-white/45">{row.reason}</p>
            </div>
            <Spark points={row.spark} tone="text-cyan-300/80" />
            <p className="w-[74px] text-right text-[12px] font-semibold text-white">{row.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------- Value Receipt */

const BUCKETS = [
  { label: "Kept you running", pct: 52 },
  { label: "Kept you safe", pct: 21 },
  { label: "Moved you forward", pct: 18 },
  { label: "Planned ahead", pct: 9 },
];

export function ReceiptMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="bg-[#eef2f7] p-4 sm:p-5">
      <div className="overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg">
        <div className="h-1.5 bg-[#0f1c3f]" />
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold">Brightline IT</span>
            <span className="text-right text-[9px] uppercase tracking-[0.12em] text-slate-400">
              Service summary
              <span className="block text-[11px] font-semibold normal-case tracking-normal text-slate-900">September 2026</span>
            </span>
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight">Carter &amp; Lowe Solicitors</p>
          <p className="mt-1 text-[11.5px] leading-5 text-slate-600">
            We resolved 47 requests for Carter &amp; Lowe in September, including 2 urgent issues.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Requests resolved", "47"],
              ["Typical first response", "38 min"],
              ["Within agreed time", "96%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-[9px] leading-tight text-slate-500">{label}</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold">Where our time went</p>
          <ul className="mt-2 space-y-1.5">
            {BUCKETS.map((bucket, index) => (
              <li key={bucket.label}>
                <div className="flex justify-between text-[10.5px] text-slate-600">
                  <span>{bucket.label}</span>
                  <span className="tabular-nums">{bucket.pct}%</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-slate-200">
                  <motion.div
                    className="h-1.5 rounded-full bg-[#0f1c3f]"
                    initial={reduce ? false : { width: 0 }}
                    animate={inView || reduce ? { width: `${bucket.pct}%` } : { width: 0 }}
                    transition={{ duration: 0.8, delay: 0.15 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10.5px] text-emerald-900">
            ✓ Fewer “Password reset” requests: 3 this month, down from about 14.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Renewal plan */

export function RenewalMock() {
  const steps = [
    { days: "90 days out", title: "Show the value", state: "done" as const },
    { days: "60 days out", title: "Price review", state: "now" as const },
    { days: "30 days out", title: "Confirm", state: "next" as const },
  ];
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-white">Ashby Primary Trust</p>
        <p className="text-[11.5px] text-white/50">
          Ends 14 Dec · <span className="font-semibold text-white">£22,800</span> a year
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {steps.map((step) => (
          <li
            key={step.title}
            className={cn(
              "rounded-lg border px-2.5 py-2",
              step.state === "now" ? "border-cyan-300/50 bg-cyan-300/[0.07]" : "border-white/10",
            )}
          >
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-white/40">
              {step.state === "done" ? <Check className="size-3 text-emerald-300" /> : null}
              {step.days}
            </p>
            <p className="mt-0.5 text-[11.5px] font-semibold text-white">{step.title}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] leading-[1.6] text-white/75">
        <p className="font-medium text-white">Your renewal on 14 December 2026</p>
        <p className="mt-1.5">
          The support your team relies on has grown since the agreement was set. From 14 December, the monthly fee would be{" "}
          <span className="rounded bg-cyan-300/15 px-1 text-cyan-100">£2,275</span>, up from £1,900.
        </p>
        <p className="mt-1.5 text-white/45">If you would rather keep the cost where it is, we can look at the scope together…</p>
      </div>
      <p className="mt-2 text-[10.5px] text-white/40">Only the old and new fee appear in the letter. Your margins never do.</p>
    </div>
  );
}

/* --------------------------------------------------------- Churn Replay */

export function ReplayMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const marks = [
    { left: "8%", label: "Normal" },
    { left: "34%", label: "Response slowed", flag: true },
    { left: "58%", label: "Tickets fell by half", flag: true },
  ];
  return (
    <div ref={ref} className="p-5">
      <p className="text-[11px] text-white/50">Churn Replay</p>
      <p className="mt-1 text-[15px] font-semibold text-white">Halden Architects left on 2 May</p>
      <p className="text-[11.5px] text-white/50">£2,100 a month, contract ended</p>
      <div className="relative mt-6 h-16">
        <div className="absolute inset-x-0 top-6 h-px bg-white/15" />
        <motion.div
          className="absolute left-0 top-6 h-px bg-gradient-to-r from-cyan-300/30 to-amber-300"
          initial={reduce ? false : { width: 0 }}
          animate={inView || reduce ? { width: "92%" } : { width: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        {marks.map((mark, index) => (
          <motion.div
            key={mark.label}
            className="absolute top-[18px] -translate-x-1/2"
            style={{ left: mark.left }}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={inView || reduce ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ delay: 0.3 + index * 0.35 }}
          >
            <span
              className={cn(
                "mx-auto block size-3 rounded-full border-2",
                mark.flag ? "border-amber-300 bg-amber-300/30" : "border-white/30 bg-[#0b1322]",
              )}
            />
            <span className={cn("mt-2 block whitespace-nowrap text-[9.5px]", mark.flag ? "text-amber-100" : "text-white/40")}>
              {mark.label}
            </span>
          </motion.div>
        ))}
        <div className="absolute right-0 top-[18px] translate-x-0 text-right">
          <span className="ml-auto block size-3 rounded-full border-2 border-rose-300 bg-rose-300/30" />
          <span className="mt-2 block text-[9.5px] text-rose-200">Left</span>
        </div>
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={inView || reduce ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.4 }}
        className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2 text-[11.5px] text-amber-50"
      >
        <Sparkles className="size-3.5 shrink-0 text-amber-200" />
        Handover would have warned you 94 days before they left.
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------- Monday Brief */

export function BriefMock() {
  return (
    <div className="bg-[#eef2f7] p-4 sm:p-5">
      <div className="rounded-xl bg-white p-4 text-slate-900 shadow-lg sm:p-5">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-sky-600">The Monday Brief</p>
        <p className="mt-2 text-[12.5px]">Morning Sam,</p>
        <p className="mt-1 text-[11.5px] text-slate-600">Here is your week, most valuable first. Three things need you.</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            ["Revenue at Risk", "£100,800/yr"],
            ["Renewing in 90 days", "£64,200/yr"],
            ["Saved Revenue", "£38,400/yr"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-100 px-2 py-1.5">
              <p className="text-[8.5px] text-slate-500">{label}</p>
              <p className="text-[11.5px] font-bold">{value}</p>
            </div>
          ))}
        </div>
        <ol className="mt-3 divide-y divide-slate-200 border-t border-slate-200 text-[11px]">
          {WEEK_ROWS.slice(0, 3).map((row, index) => (
            <li key={row.client} className="py-2">
              <p className="font-semibold">
                {index + 1}. {row.client} <span className="font-normal text-slate-500">· {row.value} a year</span>
              </p>
              <p className="text-slate-600">{row.why}</p>
              <p className="mt-0.5 font-semibold text-sky-600">{row.action}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Margin */

const MARGIN_ROWS = [
  { client: "Fenwick Logistics", rate: 118, note: "" },
  { client: "Carter & Lowe Solicitors", rate: 96, note: "" },
  { client: "Ashby Primary Trust", rate: 54, note: "Reprice" },
  { client: "Riverside Care Homes", rate: 41, note: "Fix" },
];

export function MarginMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const median = 88;
  return (
    <div ref={ref} className="p-5">
      <p className="text-[11px] text-white/50">Revenue per hour, last three months</p>
      <p className="mt-1 text-[15px] font-semibold text-white">Typical £88 an hour</p>
      <ul className="mt-4 space-y-3">
        {MARGIN_ROWS.map((row, index) => (
          <li key={row.client}>
            <div className="flex items-baseline justify-between text-[11.5px]">
              <span className="font-medium text-white">{row.client}</span>
              <span className="flex items-center gap-2">
                {row.note ? (
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-1.5 text-[9.5px] text-amber-100">{row.note}</span>
                ) : null}
                <span className="tabular-nums text-white/60">£{row.rate}</span>
              </span>
            </div>
            <div className="relative mt-1 h-1.5 rounded-full bg-white/10">
              <motion.div
                className={cn("h-1.5 rounded-full", row.rate < median * 0.75 ? "bg-amber-300" : "bg-cyan-300")}
                initial={reduce ? false : { width: 0 }}
                animate={inView || reduce ? { width: `${(row.rate / 130) * 100}%` } : { width: 0 }}
                transition={{ duration: 0.8, delay: 0.1 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="absolute -top-1 h-3.5 w-px bg-white/60" style={{ left: `${(median / 130) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Save Play */

export function SavePlayMock() {
  const steps = [
    "Check who picks up this client's tickets and whether a queue changed.",
    "Call the main contact before they raise it, and say what you are changing.",
    "Watch first response for two weeks and share the improvement.",
  ];
  return (
    <div className="p-5">
      <p className="text-[11px] font-semibold text-cyan-200">Save Play</p>
      <p className="mt-0.5 text-[15px] font-semibold text-white">Reset response times</p>
      <p className="mt-0.5 text-[11.5px] text-white/50">Westfield Manufacturing · £46,800 a year</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2.5 text-[11.5px] leading-5 text-white/80">
            <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-cyan-300/40 text-[9.5px] font-semibold text-cyan-200">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-[10.5px] text-white/45">To: sarah.mills@westfield.co.uk</p>
        <p className="mt-1 text-[11.5px] font-medium text-white">Our response times for Westfield</p>
        <p className="mt-1 text-[11px] leading-[1.6] text-white/60">
          We review service levels for every client, and our first response times for you have slipped recently. That is
          not the standard we hold ourselves to…
        </p>
        <div className="mt-2.5 flex gap-2">
          <span className="rounded-md bg-cyan-300 px-2 py-1 text-[10.5px] font-semibold text-slate-950">Send email</span>
          <span className="rounded-md border border-white/15 px-2 py-1 text-[10.5px] text-white/70">Copy</span>
        </div>
      </div>
    </div>
  );
}
