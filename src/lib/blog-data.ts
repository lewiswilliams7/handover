export type BlogFilterId = "all" | "HaloPSA" | "Reporting" | "Automation" | "Product";

export type BlogPostTag =
  | "HaloPSA"
  | "Reporting"
  | "Automation"
  | "Product"
  | "MSP"
  | "Guides"
  | "Comparison"
  | "Productivity"
  | "Project Management"
  | "Delivery";

export type BlogPostKind = "dynamic" | "legacy";

export type BlogTocItem = { id: string; label: string };

export type BlogPostMeta = {
  slug: string;
  routePath: string;
  title: string;
  /** ISO 8601 for sorting */
  dateISO: string;
  dateDisplay: string;
  author: string;
  tags: BlogPostTag[];
  description: string;
  kind: BlogPostKind;
  /** Pinned to top of blog index */
  featured?: boolean;
  /** Desktop TOC for long guides (H2 anchor ids must match article HTML). */
  toc?: readonly BlogTocItem[];
  /** When set, overrides word-count-based reading time (e.g. editorial target). */
  readMinutesOverride?: number;
};

export const BLOG_FILTER_OPTIONS: { id: BlogFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "HaloPSA", label: "HaloPSA" },
  { id: "Reporting", label: "Reporting" },
  { id: "Automation", label: "Automation" },
  { id: "Product", label: "Product" },
];

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "pitchit-2026-handover-msp-accelerator",
    routePath: "/blog/pitchit-2026-handover-msp-accelerator",
    title: "Handover is joining PitchIT 2026 — here's why we applied",
    dateISO: "2026-05-21T10:00:00.000Z",
    dateDisplay: "21 May 2026",
    author: "Lewis Williams",
    tags: ["Product", "Automation"],
    description:
      "Handover has been accepted into PitchIT 2026, ConnectWise's global accelerator for MSP software companies. Here's the problem we're solving and what we're building.",
    kind: "dynamic",
    readMinutesOverride: 5,
    toc: [
      { id: "what-is-pitchit", label: "What is PitchIT?" },
      { id: "the-problem-were-solving", label: "The problem we're solving" },
      { id: "what-handover-does", label: "What Handover does" },
      { id: "why-we-applied-to-pitchit", label: "Why we applied to PitchIT" },
      { id: "whats-next", label: "What's next" },
    ],
  },
  {
    slug: "sap-n8n-msp-automation",
    routePath: "/blog/sap-n8n-msp-automation",
    title: "What SAP's $5.2B investment in n8n means for MSP automation",
    dateISO: "2026-05-13T10:00:00.000Z",
    dateDisplay: "13 May 2026",
    author: "Lewis Williams",
    tags: ["Automation", "MSP"],
    description:
      "SAP valued n8n at $5.2B and is embedding it in Joule Studio. Here's what that says about enterprise workflow automation — and why MSP client reporting is in the same category.",
    kind: "dynamic",
    readMinutesOverride: 5,
  },
  {
    slug: "best-msp-client-reporting-tool-2026",
    routePath: "/blog/best-msp-client-reporting-tool-2026",
    title: "The Best MSP Client Reporting Tool in 2026",
    dateISO: "2026-05-11T10:00:00.000Z",
    dateDisplay: "11 May 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "Automation"],
    description:
      "Tired of manual MSP client reports? Compare your options and see why Handover is the purpose-built reporting tool for HaloPSA and ConnectWise MSPs.",
    kind: "dynamic",
    readMinutesOverride: 6,
    toc: [
      { id: "problem-with-msp-client-reporting-today", label: "The problem today" },
      { id: "what-to-look-for-msp-reporting-tool", label: "What to look for" },
      { id: "why-handover-is-different", label: "Why Handover is different" },
      { id: "what-you-get", label: "What you get" },
      { id: "the-roi", label: "The ROI" },
    ],
  },
  {
    slug: "msp-qbr-automation",
    routePath: "/blog/msp-qbr-automation",
    title: "How MSPs Can Automate Their QBR Process in 2026",
    dateISO: "2026-05-10T12:00:00.000Z",
    dateDisplay: "10 May 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "HaloPSA"],
    description:
      "QBR preparation takes hours. Here's how MSPs using HaloPSA and ConnectWise are automating quarterly business reviews with Handover.",
    kind: "dynamic",
    readMinutesOverride: 6,
    toc: [
      { id: "why-qbr-preparation-takes-so-long", label: "Why QBR prep takes so long" },
      { id: "what-a-good-qbr-actually-needs", label: "What a good QBR needs" },
      { id: "how-handover-automates-qbr-prep", label: "How Handover automates prep" },
      { id: "what-the-output-looks-like", label: "What the output looks like" },
      { id: "from-hours-to-minutes", label: "From hours to minutes" },
    ],
  },
  {
    slug: "msp-client-portal-guide",
    routePath: "/blog/msp-client-portal-guide",
    title: "What MSP Clients Actually Want to See in a Client Portal",
    dateISO: "2026-05-09T12:00:00.000Z",
    dateDisplay: "9 May 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "Product"],
    description:
      "Most MSP client portals show too much or too little. Here's what clients actually want — and how Handover's client portal delivers it.",
    kind: "dynamic",
    readMinutesOverride: 6,
    toc: [
      { id: "problem-with-most-msp-client-portals", label: "The problem with most portals" },
      { id: "what-clients-actually-care-about", label: "What clients care about" },
      { id: "what-to-include-and-leave-out", label: "What to include (and leave out)" },
      { id: "how-handovers-client-portal-works", label: "How Handover's portal works" },
      { id: "why-visibility-builds-retention", label: "Why visibility builds retention" },
    ],
  },
  {
    slug: "pitchit-2026-building-msp-saas",
    routePath: "/blog/pitchit-2026-building-msp-saas",
    title: "Building an MSP SaaS at 18: Handover's PitchIT 2026 Journey",
    dateISO: "2026-05-08T12:00:00.000Z",
    dateDisplay: "8 May 2026",
    author: "Lewis Williams",
    tags: ["Product", "Automation"],
    description:
      "Handover has been accepted into PitchIT 2026 — ConnectWise's global MSP accelerator. Here's the story of building an MSP SaaS product while working full time as a TPM.",
    kind: "dynamic",
    readMinutesOverride: 6,
    toc: [
      { id: "what-is-pitchit", label: "What is PitchIT?" },
      { id: "how-handover-started", label: "How Handover started" },
      { id: "what-were-building", label: "What we're building" },
      { id: "what-pitchit-means-for-handover", label: "What PitchIT means" },
      { id: "whats-next", label: "What's next" },
    ],
  },
  {
    slug: "handover-vs-rewst-vs-n8n-msp-reporting",
    routePath: "/blog/handover-vs-rewst-vs-n8n-msp-reporting",
    title: "Handover vs Rewst vs n8n: Which Tool Actually Solves MSP Reporting?",
    dateISO: "2026-04-30T12:00:00.000Z",
    dateDisplay: "30 April 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "MSP", "Comparison", "Automation"],
    description:
      "Rewst and n8n are powerful automation platforms. But are they the right tool for MSP client reporting? Here's an honest comparison.",
    kind: "legacy",
  },
  {
    slug: "why-msp-engineers-dread-friday-reporting",
    routePath: "/blog/why-msp-engineers-dread-friday-reporting",
    title: "Why MSP Engineers Dread the Friday Report",
    dateISO: "2026-04-29T18:00:00.000Z",
    dateDisplay: "29 April 2026",
    author: "Lewis Williams",
    tags: ["MSP", "Reporting", "Productivity"],
    description:
      "Why MSP reporting becomes a weekly drain, what it really costs, and what a better client-ready reporting workflow looks like.",
    kind: "legacy",
    readMinutesOverride: 6,
  },
  {
    slug: "connectwise-manage-integration-msp-reporting",
    routePath: "/blog/connectwise-manage-integration-msp-reporting",
    title: "Handover Now Supports ConnectWise Manage: AI-Powered Client Reporting for MSPs",
    dateISO: "2026-04-15T12:00:00.000Z",
    dateDisplay: "15 April 2026",
    author: "Lewis Williams",
    tags: ["Product", "MSP", "Reporting"],
    description:
      "Handover now integrates with ConnectWise Manage, joining HaloPSA as a supported PSA. Generate AI-powered client reports from your tickets and projects in under 30 seconds.",
    kind: "legacy",
    readMinutesOverride: 8,
  },
  {
    slug: "handover-live-halopsa-marketplace",
    routePath: "/blog/handover-live-halopsa-marketplace",
    title: "Handover Is Now Live on the HaloPSA Marketplace",
    dateISO: "2026-04-10T16:00:00.000Z",
    dateDisplay: "10 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Product", "MSP"],
    description:
      "Handover is now live on the HaloPSA marketplace, helping MSP delivery teams automate client updates, handover notes, action logs, and scheduled reports from live ticket data.",
    kind: "legacy",
    readMinutesOverride: 5,
  },
  {
    slug: "halopsa-ticket-history-incomplete",
    routePath: "/blog/halopsa-ticket-history-incomplete",
    title: "Why Your HaloPSA Ticket History Is Incomplete (And How to Fix It)",
    dateISO: "2026-04-10T12:00:00.000Z",
    dateDisplay: "10 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Guides", "MSP"],
    description:
      "Most MSPs have a gap in their HaloPSA ticket history - client communications that never get logged back. Here's why it happens and how to fix it permanently.",
    kind: "legacy",
    readMinutesOverride: 6,
  },
  {
    slug: "client-ready-project-update-60-seconds",
    routePath: "/blog/client-ready-project-update-60-seconds",
    title: "How to Write a Client-Ready Project Update in Under 60 Seconds",
    dateISO: "2026-04-09T12:00:00.000Z",
    dateDisplay: "9 April 2026",
    author: "Lewis Williams",
    tags: ["Guides", "MSP", "Project Management"],
    description:
      "Most MSP PMs spend 20-30 minutes writing a single client update. Here's how to cut that to under 60 seconds without sacrificing quality.",
    kind: "legacy",
    readMinutesOverride: 5,
  },
  {
    slug: "good-msp-project-delivery-2026",
    routePath: "/blog/good-msp-project-delivery-2026",
    title: "What Good MSP Project Delivery Looks Like in 2026",
    dateISO: "2026-04-08T12:00:00.000Z",
    dateDisplay: "8 April 2026",
    author: "Lewis Williams",
    tags: ["MSP", "Project Management", "Delivery"],
    description:
      "The bar for MSP project delivery has risen. Here's what separates MSPs with strong client relationships from those still running projects the old way in 2026.",
    kind: "legacy",
    readMinutesOverride: 8,
  },
  {
    slug: "halopsa-reporting-native-vs-dedicated-tools",
    routePath: "/blog/halopsa-reporting-native-vs-dedicated-tools",
    title: "HaloPSA Reporting: Native Tools vs Dedicated Reporting Software",
    dateISO: "2026-04-07T12:00:00.000Z",
    dateDisplay: "7 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Reporting", "Comparison"],
    description:
      "HaloPSA has reporting built in - but is it enough for client-facing project delivery? We compare native HaloPSA reporting against dedicated tools and explain when you need both.",
    kind: "legacy",
    readMinutesOverride: 7,
  },
  {
    slug: "automate-client-project-updates-halopsa",
    routePath: "/blog/automate-client-project-updates-halopsa",
    title: "How MSPs Can Automate Client Project Updates with HaloPSA",
    dateISO: "2026-04-06T12:00:00.000Z",
    dateDisplay: "6 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Automation", "Guides"],
    description:
      "Learn how MSPs using HaloPSA can automate client project updates, eliminate manual reformatting, and deliver consistent weekly reports without PM admin overhead.",
    kind: "legacy",
    readMinutesOverride: 7,
  },
  {
    slug: "hidden-cost-manual-project-reporting-msps",
    routePath: "/blog/hidden-cost-manual-project-reporting-msps",
    title: "The Hidden Cost of Manual Project Reporting for MSPs",
    dateISO: "2026-04-06T09:00:00.000Z",
    dateDisplay: "6 April 2026",
    author: "Lewis Williams",
    tags: ["MSP", "Reporting", "Productivity"],
    description:
      "Manual project reporting costs MSPs more than they realise. This breakdown covers the direct time cost, indirect costs, and what replacing the process actually looks like.",
    kind: "legacy",
    readMinutesOverride: 6,
  },
  {
    slug: "best-halopsa-reporting-tools",
    routePath: "/blog/best-halopsa-reporting-tools",
    title: "The Best HaloPSA Reporting Tools for MSP Teams in 2026",
    dateISO: "2026-04-05T12:00:00.000Z",
    dateDisplay: "5 April 2026",
    author: "Lewis Williams",
    tags: ["Guides", "HaloPSA", "Reporting"],
    description:
      "A honest comparison of the best reporting tools that integrate with HaloPSA - from native dashboards to AI-powered report generation. Written by an MSP delivery team.",
    kind: "dynamic",
    featured: true,
    readMinutesOverride: 8,
    toc: [
      { id: "what-to-look-for", label: "What to look for" },
      { id: "handover", label: "1. Handover" },
      { id: "squared-up", label: "2. Squared Up" },
      { id: "renada", label: "3. Renada" },
      { id: "halopsa-native-reporting", label: "4. HaloPSA native" },
      { id: "mspbots", label: "5. MSPBots" },
      { id: "comparison-table", label: "Comparison table" },
      { id: "which-tool-is-right", label: "Which tool is right?" },
      { id: "bottom-line", label: "The bottom line" },
    ],
  },
  {
    slug: "handover-halopsa-marketplace",
    routePath: "/blog/handover-halopsa-marketplace",
    title:
      "Handover joins the HaloPSA marketplace - here's what that means for MSP delivery teams",
    dateISO: "2026-04-03T18:00:00.000Z",
    dateDisplay: "3 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Product"],
    description:
      "Handover on the HaloPSA integrations marketplace: live data, five outputs, push-back to tickets, and scheduled weekly reports for MSP delivery teams.",
    kind: "dynamic",
  },
  {
    slug: "msp-reporting-hidden-cost",
    routePath: "/blog/msp-reporting-hidden-cost",
    title:
      "The hidden cost of manual MSP reporting - and why it's not just a time problem",
    dateISO: "2026-04-03T14:00:00.000Z",
    dateDisplay: "3 April 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "MSP"],
    description:
      "Beyond hours: consistency, visibility, trust, and opportunity cost - and what good MSP reporting looks like when it is integrated with your PSA.",
    kind: "dynamic",
  },
  {
    slug: "msp-project-manager-reporting-problem",
    routePath: "/blog/msp-project-manager-reporting-problem",
    title:
      "Why MSP project managers spend Friday afternoons writing reports - and how to stop",
    dateISO: "2026-04-03T10:00:00.000Z",
    dateDisplay: "3 April 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "MSP"],
    description:
      "Why weekly client reporting takes so long, what it really costs, and how teams remove the blank page by connecting the PSA to a generation layer.",
    kind: "dynamic",
  },
  {
    slug: "halopsa-client-reporting-automation",
    routePath: "/blog/halopsa-client-reporting-automation",
    title: "How to automate client reporting from HaloPSA",
    dateISO: "2026-04-03T08:00:00.000Z",
    dateDisplay: "3 April 2026",
    author: "Lewis Williams",
    tags: ["HaloPSA", "Reporting", "Automation"],
    description:
      "What HaloPSA reports natively, where client-facing reporting falls short, and how API pull, generation, and push-back close the loop end to end.",
    kind: "dynamic",
  },
  {
    slug: "push-to-halopsa-scheduled-reports",
    routePath: "/blog/push-to-halopsa-scheduled-reports",
    title: "Your MSP reports now write and file themselves",
    dateISO: "2026-04-02T12:00:00.000Z",
    dateDisplay: "2 April 2026",
    author: "Lewis Williams",
    tags: ["Product", "HaloPSA", "Automation"],
    description:
      "Push to HaloPSA and scheduled weekly reports close the loop: pull from HaloPSA, generate, push back - without copy-pasting or weekly manual runs.",
    kind: "legacy",
  },
  {
    slug: "msp-weekly-reporting",
    routePath: "/blog/msp-weekly-reporting",
    title: "How MSPs Can Cut Weekly Reporting Time from 5 Hours to 20 Minutes",
    dateISO: "2026-03-25T12:00:00.000Z",
    dateDisplay: "25 March 2026",
    author: "Lewis Williams",
    tags: ["Reporting", "MSP"],
    description:
      "Most MSP project managers spend 4-5 hours every week writing the same reports. Here is how to cut that to under 20 minutes without sacrificing quality.",
    kind: "legacy",
  },
];

export function readMinutesFromWordCount(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

export function getAllPostsSorted(): BlogPostMeta[] {
  return [...BLOG_POSTS].sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fb !== fa) return fb - fa;
    return new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime();
  });
}

export function getPostBySlug(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function postMatchesFilter(post: BlogPostMeta, filter: BlogFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "HaloPSA") return post.tags.includes("HaloPSA");
  if (filter === "Automation") return post.tags.includes("Automation");
  if (filter === "Product") return post.tags.includes("Product");
  if (filter === "Reporting") {
    return (
      post.tags.includes("Reporting") ||
      post.tags.includes("MSP") ||
      post.tags.includes("Guides")
    );
  }
  return false;
}

export function getRelatedPosts(slug: string, limit = 2): BlogPostMeta[] {
  const current = getPostBySlug(slug);
  if (!current) return [];

  const others = BLOG_POSTS.filter((p) => p.slug !== slug);
  const scored = others.map((p) => {
    const overlap = p.tags.filter((t) => current.tags.includes(t)).length;
    return { post: p, overlap, date: new Date(p.dateISO).getTime() };
  });

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.date - a.date;
  });

  return scored.slice(0, limit).map((s) => s.post);
}
