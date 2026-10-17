/**
 * Compact scan stories, at /case-studies/<slug>. Listed on /case-studies and
 * in the sitemap automatically. Only facts the MSP told us; nothing invented,
 * and anonymised unless they have agreed to be named.
 */
export type CaseStudy = {
  slug: string;
  title: string;
  description: string;
  /** Who, without naming them. */
  who: string;
  headlineStat: { value: string; label: string };
  facts: Array<{ value: string; label: string }>;
  sections: Array<{ heading: string; body: string[] }>;
  takeaway: string;
  updated: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "five-months-on-halopsa",
    title: "Five months on HaloPSA. About 45 warning signs on the first scan.",
    description:
      "An MSP that moved to HaloPSA in April 2026 ran Handover's free scan and found around 45 warning signs across its clients. Why a short history is still enough.",
    who: "An MSP director, on HaloPSA since April 2026",
    headlineStat: { value: "~45", label: "warning signs on the first scan" },
    facts: [
      { value: "April 2026", label: "Moved to HaloPSA" },
      { value: "~5 months", label: "Of history at scan time" },
      { value: "About a minute", label: "Typical scan time" },
    ],
    sections: [
      {
        heading: "The worry: is five months enough?",
        body: [
          "The director had moved the business onto HaloPSA in April 2026, so by the time he ran the scan it held about five months of tickets.",
          "The fair question was whether a tool that compares clients against their own history would have anything to say yet.",
        ],
      },
      {
        heading: "What the scan found",
        body: [
          "He ran the free, read-only scan himself. It picked up around 45 warning signs across his client base.",
          "Handover works out each client's normal range from about six months of its tickets: three to learn what usual looks like, and the latest three to compare against it. A business five or six months into a new PSA is right at that line, which is enough for most clients that raise tickets regularly.",
          "Some checks need no history at all. Contracts coming up for renewal, quotes left waiting and active contracts with no recent activity are checked from the first day.",
        ],
      },
      {
        heading: "Why that matters after a PSA move",
        body: [
          "The months after a migration are when things slip: tickets land in the wrong queue, owners are not set, contracts are half moved across. That is the kind of thing the scan's housekeeping checks look for, alongside the warning signs.",
          "Handover is also honest about what it cannot measure yet. Where a client has too little history to compare, it says so instead of guessing, and a sign measured on a short history is labelled worth a look rather than strong.",
        ],
      },
    ],
    takeaway: "You do not need years of PSA history to start. You need a read-only API key and a minute.",
    updated: "2026-10-17",
  },
];

export function getCaseStudy(slug: string): CaseStudy | null {
  return CASE_STUDIES.find((study) => study.slug === slug) ?? null;
}
