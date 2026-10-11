/**
 * Press releases. Each one is plain structured content so the index, the
 * release page and the sitemap all read from one place.
 */
export type PressBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; by: string };

export type PressRelease = {
  slug: string;
  title: string;
  subtitle: string;
  /** ISO date the release is dated. */
  dateISO: string;
  dateDisplay: string;
  dateline: string;
  summary: string;
  body: PressBlock[];
  relatedBlog?: { href: string; label: string };
};

export const PRESS_BOILERPLATE =
  "Handover is client retention software for managed service providers. It connects to HaloPSA and ConnectWise Manage, measures every client against its own history each week, and shows MSP owners which clients have changed, what they are worth and what to do next. Handover is listed on the HaloPSA and ConnectWise marketplaces and is based in Birmingham, UK.";

export const PRESS_CONTACT = {
  name: "Lewis Williams",
  role: "Founder",
  email: "hello@gethandover.uk",
};

export const PRESS_RELEASES: PressRelease[] = [
  {
    slug: "handover-relaunches-as-client-retention-platform",
    title: "Handover relaunches as a client retention platform for managed service providers",
    subtitle:
      "Birmingham software company turns HaloPSA and ConnectWise data into a weekly early warning for the clients MSPs are at risk of losing",
    dateISO: "2026-10-12",
    dateDisplay: "12 October 2026",
    dateline: "BIRMINGHAM, UK, 12 October 2026",
    summary:
      "Handover now measures every client against its own history each week and shows MSP owners which clients have changed, what they are worth and what to do before the relationship is lost. One plan, £499 a month, unlimited users.",
    body: [
      {
        kind: "p",
        text: "Handover, a software company built for managed service providers (MSPs), today relaunched its platform around client retention. Handover connects to HaloPSA and ConnectWise Manage, reads each client's tickets, contracts and billing every week, and measures every client against its own history. Owners see which clients have changed, how much revenue those clients hold, and what to do about it, while there is still time to act.",
      },
      {
        kind: "p",
        text: "Most MSPs find out a client is unhappy when the client tells them, often at renewal and often too late. JumpCloud's 2024 SME IT Trends research found that nearly a quarter (23%) of small and mid-sized businesses have ended a relationship with an MSP because of poor customer service. The early signs, such as a client raising far fewer tickets, response times drifting or a contract renewing on an account that has gone quiet, are usually already recorded in the MSP's PSA. Few teams have time to read them across every client, every week.",
      },
      { kind: "h", text: "What Handover does" },
      {
        kind: "list",
        items: [
          "Revenue at Risk™ lists every client whose behaviour has changed against its own history, ranked by the annual revenue it holds, with the evidence attached.",
          "Save Plays™ give the next steps and a ready-to-send email to the client's decision-maker for every warning sign.",
          "Client Margin shows which clients create far more work than they pay for, using time logged or tickets raised.",
          "Renewal Radar lines up every contract ending in the next twelve months with the move to make first: save, fix, reprice or renew early.",
          "Value Receipts™ send each client's decision-maker a branded monthly summary of the work done, from the MSP's own address.",
          "The Monday Brief emails owners their week every Monday morning, and Saved Revenue counts the annual value of flagged clients that recover.",
        ],
      },
      {
        kind: "p",
        text: "Handover deliberately does not predict churn. It flags measured changes and shows the evidence, so the people who know the client decide what the change means. Where a PSA does not hold enough data to support a figure, Handover leaves the figure out rather than estimating it.",
      },
      {
        kind: "quote",
        text: "Every MSP owner I spoke to knew their top five clients inside out. It was the rest of the book that worried them: the client nobody had spoken to since spring, the contract renewing on an account that had gone quiet. That information was already sitting in their PSA. Handover reads it every week and puts the clients that have changed in front of the owner, with the evidence and the next move, while there's still time to do something about it.",
        by: "Lewis Williams, founder of Handover",
      },
      { kind: "h", text: "Try it on your own data" },
      {
        kind: "p",
        text: "MSPs can run a free, read-only scan of their HaloPSA or ConnectWise instance at gethandover.uk. In about a minute the scan shows their Revenue at Risk, upcoming renewals, margin gap and a Churn Replay™: Handover rewinds the PSA to the months before each client the MSP lost and shows whether it would have raised a warning, using only the data held at the time.",
      },
      { kind: "h", text: "Pricing and availability" },
      {
        kind: "p",
        text: "Handover is available now as a single plan at £499 a month or £4,990 a year, with every product and unlimited users included. Every customer receives a 30-day launch programme run by the founder. A Starter Programme is available by application for MSPs with fewer than 15 clients, and enterprise terms for MSPs with more than 150. Existing customers keep access to the reporting tools Handover was first built for, including service reviews, QBR packs and scheduled reports.",
      },
    ],
    relatedBlog: {
      href: "/blog/handover-client-retention-platform",
      label: "Read the founder's post: what changed and why",
    },
  },
];

export function getPressRelease(slug: string): PressRelease | undefined {
  return PRESS_RELEASES.find((release) => release.slug === slug);
}
