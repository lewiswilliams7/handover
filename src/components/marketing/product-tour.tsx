"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  AppFrame,
  BriefMock,
  MarginMock,
  ReceiptMock,
  RenewalMock,
  ReplayMock,
  RiskMock,
  WeekListMock,
} from "@/components/marketing/product-mocks";
import { cn } from "@/lib/utils";

type TourStop = {
  key: string;
  tab: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  path: string;
  label: string;
  Mock: () => React.ReactElement;
};

export const TOUR: TourStop[] = [
  {
    key: "week",
    tab: "This week",
    title: "One list. Most valuable first.",
    body: "Every warning sign, renewal and thin margin across your book, ranked by what it's worth. Each row has one action, often an email already written.",
    href: "/features/monday-brief",
    linkLabel: "How the list is ranked",
    path: "/week",
    label: "The This week list: four clients ranked by value, each with a reason and one action",
    Mock: () => <WeekListMock autoplay={false} />,
  },
  {
    key: "risk",
    tab: "Revenue at Risk",
    title: "Who is slipping, in pounds.",
    body: "Each client is measured against its own normal: response times, ticket volume, backlog, contact. When one moves outside it, you see the client and what they pay you.",
    href: "/features/revenue-at-risk",
    linkLabel: "What counts as at risk",
    path: "/attention",
    label: "Revenue at Risk: £100,800 a year held by three clients, each with the change behind it",
    Mock: RiskMock,
  },
  {
    key: "receipts",
    tab: "Value Receipts",
    title: "Show clients what they pay for.",
    body: "A branded one-page summary for each decision-maker, every month, built from the tickets your team closed. Sent from you, not from us.",
    href: "/features/value-receipts",
    linkLabel: "See a full receipt",
    path: "/receipts",
    label: "A Value Receipt for a law firm: 47 requests resolved, where the time went, and a recurring issue that fell",
    Mock: ReceiptMock,
  },
  {
    key: "renewals",
    tab: "Renewals",
    title: "Walk into every renewal ready.",
    body: "A plan for each contract at 90, 60 and 30 days, with the emails drafted. On thin-margin clients, a price-rise letter that never shows your margins.",
    href: "/features/renewal-radar",
    linkLabel: "How renewal plans work",
    path: "/renewals",
    label: "A renewal plan at the price review step, with the letter drafted",
    Mock: RenewalMock,
  },
  {
    key: "margin",
    tab: "Margin",
    title: "Know who pays for the work.",
    body: "Revenue per hour for every client, from the time your team logs, against your typical rate. The ones well below it are flagged to fix or reprice.",
    href: "/features/client-margin",
    linkLabel: "How margin is measured",
    path: "/margin",
    label: "Client margin bars against a typical £88 an hour, two clients flagged",
    Mock: MarginMock,
  },
  {
    key: "replay",
    tab: "Churn Replay",
    title: "Proof on clients you already lost.",
    body: "Handover rewinds your PSA to before each client left and runs the same checks. You see whether it would have warned you, and how early.",
    href: "/features/churn-replay",
    linkLabel: "How the replay works",
    path: "/attention?tab=replay",
    label: "Churn Replay timeline: a client flagged 94 days before they left",
    Mock: ReplayMock,
  },
];

/** The product in six screens: tabs on the left, the real screen on the right. */
export function ProductTour({ stops = TOUR }: { stops?: TourStop[] }) {
  const [active, setActive] = useState(stops[0]!.key);
  const stop = stops.find((item) => item.key === active) ?? stops[0]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
      <div className="min-w-0">
        <div role="tablist" aria-label="Handover, screen by screen" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {stops.map((item) => {
            const selected = item.key === stop.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`tour-tab-${item.key}`}
                aria-selected={selected}
                aria-controls={`tour-panel-${item.key}`}
                onClick={() => setActive(item.key)}
                className={cn(
                  "relative shrink-0 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors lg:py-3",
                  selected ? "text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="tour-pill"
                    className="absolute inset-0 rounded-xl border border-cyan-300/30 bg-cyan-300/[0.08]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative">{item.tab}</span>
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stop.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-5 lg:mt-8 lg:px-4"
          >
            <h3 className="text-2xl font-semibold tracking-tight text-white">{stop.title}</h3>
            <p className="mt-2 max-w-md text-[15px] leading-7 text-white/65">{stop.body}</p>
            <Link href={stop.href} className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              {stop.linkLabel}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
      <div id={`tour-panel-${stop.key}`} role="tabpanel" aria-labelledby={`tour-tab-${stop.key}`} className="relative min-w-0">
        <div aria-hidden className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(56,189,248,0.18),transparent)]" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stop.key}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.22 }}
          >
            <AppFrame path={stop.path} label={stop.label}>
              <stop.Mock />
            </AppFrame>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** For pages that want the Monday Brief as a picture. */
export { BriefMock };
