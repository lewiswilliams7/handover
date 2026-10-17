/**
 * Compact comparisons for the retention product. Each one is a page at
 * /compare/<slug>, listed on /compare and in the sitemap automatically.
 * The older reporting comparisons keep their own folders under /compare.
 */
export type ComparePage = {
  slug: string;
  /** What Handover is compared with, as people search for it. */
  them: string;
  title: string;
  description: string;
  /** One sentence for the index card. */
  summary: string;
  intro: string;
  rows: Array<{ label: string; them: string; handover: string }>;
  /** Where the other option is genuinely the better fit. Honest, always. */
  theyWin: string[];
  faqs: Array<{ q: string; a: string }>;
  visual: "risk" | "week" | "receipt" | "replay";
  updated: string;
};

export const COMPARE_PAGES: ComparePage[] = [
  {
    slug: "handover-vs-psa-dashboards",
    them: "PSA dashboards",
    title: "Handover vs PSA dashboards",
    description:
      "HaloPSA and ConnectWise dashboards show your tickets. Handover shows which clients are slipping, what they are worth and what to do about it.",
    summary: "Dashboards count tickets. Handover tells you which clients changed, and what they pay you.",
    intro:
      "Your PSA already has dashboards, and they are good at what they do: open tickets, SLA breaches, technician load. What they do not do is look at each client against its own history and tell you, in pounds, who is drifting.",
    rows: [
      { label: "Question it answers", them: "How is the service desk doing?", handover: "Which clients might we lose, and what are they worth?" },
      { label: "Baseline", them: "Fixed targets you set", handover: "Each client's own normal range, worked out from its history" },
      { label: "Money", them: "Not shown", handover: "Every flag carries the client's annual value" },
      { label: "Quiet clients", them: "Look healthy: no tickets, no breaches", handover: "Flagged when activity drops well below their usual level" },
      { label: "What to do next", them: "Up to you", handover: "One action per client, often an email already written" },
      { label: "Renewals and margin", them: "Separate reports, if built", handover: "In the same weekly list, with a plan at 90, 60 and 30 days" },
      { label: "Setup", them: "Build and maintain the widgets", handover: "Read-only API key, results in about a minute" },
    ],
    theyWin: [
      "Live, minute-by-minute desk management: queues, SLA timers and technician workload.",
      "Custom operational reports your team already relies on.",
    ],
    faqs: [
      {
        q: "Does Handover replace my PSA dashboards?",
        a: "No. Keep them for running the desk. Handover sits on top and looks at clients rather than tickets: who changed, what they are worth, and what to do this week.",
      },
      {
        q: "Can't I build this in HaloPSA or ConnectWise reports?",
        a: "You can build pieces of it, such as tickets per client per month. Comparing every client against its own spread, valuing it, ranking it and keeping that up every week is the part that takes the time.",
      },
      {
        q: "Does it change anything in my PSA?",
        a: "No. Handover connects read-only.",
      },
    ],
    visual: "risk",
    updated: "2026-10-17",
  },
  {
    slug: "handover-vs-client-health-spreadsheets",
    them: "client health spreadsheets",
    title: "Handover vs client health spreadsheets",
    description:
      "Red, amber, green spreadsheets go stale the week after they are filled in. Handover checks every client against its own history, every week, from your PSA.",
    summary: "A RAG spreadsheet is a guess from last month. Handover is measured every week.",
    intro:
      "Most MSPs have tried it: a spreadsheet of clients with a red, amber or green next to each, updated before the quarterly meeting. It works until the person who maintains it gets busy, and by then the scores reflect how people felt, not what changed.",
    rows: [
      { label: "Source", them: "Whoever filled it in, from memory", handover: "Tickets, time, contracts and billing in your PSA" },
      { label: "How often", them: "When someone remembers", handover: "Every week, automatically" },
      { label: "Covers", them: "The clients people think about", handover: "Every client, including the quiet ones" },
      { label: "Evidence", them: "A colour", handover: "The change, the client's normal range and the tickets behind it" },
      { label: "Money", them: "Sometimes a column", handover: "Annual value on every flag, totalled as Revenue at Risk" },
      { label: "Learns", them: "No", handover: "Mark a sign normal for a client, or not useful, and the list adjusts" },
      { label: "Cost", them: "Hours of someone's month", handover: "£499 a month, unlimited users" },
    ],
    theyWin: [
      "Things a PSA cannot see, such as how the last meeting with the MD felt. Keep a notes column for that.",
      "Very small books where the owner already speaks to every client every month.",
    ],
    faqs: [
      {
        q: "We like our spreadsheet. Can we keep it?",
        a: "Yes. Many owners keep a short notes column for the relationship side and let Handover do the measuring. The weekly list tells you which rows to look at.",
      },
      {
        q: "Is there a health score?",
        a: "There is a book health score, made only from measures your data supports, each shown with its raw figure. Per client, Handover shows the actual change rather than a single number, so you can argue with it.",
      },
      {
        q: "What if our PSA data is messy?",
        a: "The scan tells you which checks your data supports and the one fix that unlocks each of the rest. Numbers it cannot stand behind are left out, not guessed.",
      },
    ],
    visual: "week",
    updated: "2026-10-17",
  },
  {
    slug: "handover-vs-customer-success-platforms",
    them: "customer success platforms",
    title: "Handover vs customer success platforms",
    description:
      "Gainsight, ChurnZero and Vitally are built for SaaS product usage. Handover is built for MSPs, from HaloPSA and ConnectWise data.",
    summary: "Customer success suites are built around product logins. MSP clients raise tickets.",
    intro:
      "Customer success platforms are excellent at what they were built for: software companies watching how customers use their product. An MSP's clients do not log in to your product. They raise tickets, sign contracts and renew, and that is what Handover reads.",
    rows: [
      { label: "Built for", them: "SaaS companies", handover: "MSPs on HaloPSA or ConnectWise" },
      { label: "Data it needs", them: "Product usage events, CRM, integrations to build", handover: "Your PSA, with a read-only key" },
      { label: "Time to value", them: "Weeks to months of implementation", handover: "About a minute for the first scan" },
      { label: "Signals", them: "Logins, feature adoption, NPS", handover: "Response times, ticket volume, backlog, contacts, contracts, margin" },
      { label: "Proof to clients", them: "Not included", handover: "Value Receipts for every decision-maker" },
      { label: "Pricing", them: "Usually per seat, often five figures a year", handover: "£499 a month, unlimited users" },
    ],
    theyWin: [
      "If you also sell your own software product and track how customers use it.",
      "Large customer success teams that need playbook automation across many systems.",
    ],
    faqs: [
      {
        q: "Could we make a customer success platform work with PSA data?",
        a: "Possibly, with a data pipeline, mapping and someone to maintain it. Handover reads the PSA directly and is already tuned to what PSA data means.",
      },
      {
        q: "Do we need a customer success team to use Handover?",
        a: "No. It is built for owners and account managers who do client care alongside everything else. One list a week, most valuable first.",
      },
      {
        q: "Can we try it before talking to anyone?",
        a: "Yes. Run the free scan on your own PSA. No card, nothing to cancel.",
      },
    ],
    visual: "replay",
    updated: "2026-10-17",
  },
];

export function getComparePage(slug: string): ComparePage | null {
  return COMPARE_PAGES.find((page) => page.slug === slug) ?? null;
}
