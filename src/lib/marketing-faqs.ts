/**
 * Buyer questions answered on the marketing site. Every answer must match
 * what the product, security page and terms actually say.
 */
export type MarketingFaq = { q: string; a: string };

export const PRICING_FAQS: ReadonlyArray<MarketingFaq> = [
  {
    q: "Do we need to change anything in our PSA?",
    a: "No. Handover reads HaloPSA or ConnectWise through a read-only API connection you control. It never changes a ticket unless you choose to push a note back yourself.",
  },
  {
    q: "What if our PSA data is messy?",
    a: "Most is. Handover measures each client against its own history, leaves out anything it can't back up, and tells you exactly what to tidy. If your team doesn't log time, Client Margin works per ticket instead.",
  },
  {
    q: "How do I know it's worth it before paying?",
    a: "Run the free scan. In about a minute you see your Revenue at Risk and a Churn Replay of the clients you lost last year, on your own data. No card, no trial to cancel.",
  },
  {
    q: "Where is our data kept?",
    a: "In the EU, and it never leaves the EU or UK. PSA credentials are encrypted with AES-256. Deleting your account deletes everything.",
  },
  {
    q: "Is there a contract?",
    a: "No minimum term. Pay monthly or yearly (two months free), cancel any time, and keep access to the end of what you've paid for.",
  },
  {
    q: "We're smaller, or much larger. Does the price still fit?",
    a: "Under 15 clients, apply for the Starter Programme. Over 150, talk to us about Enterprise. Everyone else gets everything for one price, however many people use it.",
  },
];

/** Questions for the homepage: what it is and whether it will work for us. */
export const HOME_FAQS: ReadonlyArray<MarketingFaq> = [
  {
    q: "What does Handover actually do?",
    a: "It reads your HaloPSA or ConnectWise data every week, spots the clients whose behaviour has changed against their own history, tells you what they are worth and what to do, and shows each client what you did for them.",
  },
  {
    q: "Is this just another reporting tool?",
    a: "No. Reports tell you what happened. Handover tells you which clients are slipping before they tell you, with the evidence, the next move and the email to send.",
  },
  PRICING_FAQS[0]!,
  PRICING_FAQS[1]!,
  PRICING_FAQS[2]!,
  PRICING_FAQS[3]!,
];
