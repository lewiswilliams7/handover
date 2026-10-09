import type { FindingType } from "@/lib/psa/scan-findings";

/**
 * Save Plays™: what to do about each kind of signal.
 *
 * Deterministic on purpose. A play is written once, by someone who has run
 * MSP accounts, and reads the same every time, so an account manager can
 * trust it and act in seconds. The email is addressed to the client's
 * decision-maker and never mentions Handover, the scan or internal figures:
 * driver facts are written for the MSP (baselines, portfolio rank, revenue)
 * and stay on the card.
 */

export type SavePlay = {
  /** Short imperative name of the play. */
  title: string;
  /** One sentence on why this signal matters commercially. */
  why: string;
  /** Ordered steps for the account owner. */
  steps: string[];
  /** Client-facing email; `{client}` and `{sender}` are filled in. */
  email: { subject: string; body: string };
};

const SIGN_OFF = "\n\nBest regards,\n{sender}";

const PLAYS: Record<FindingType, SavePlay> = {
  response_drift: {
    title: "Reset response times",
    why: "Slower first responses are the first thing a client feels, and the first thing they mention at renewal.",
    steps: [
      "Check who picks up this client's tickets and whether a queue or rota changed.",
      "Call the main contact before they raise it, and say what you are changing.",
      "Watch first response for two weeks and share the improvement with them.",
    ],
    email: {
      subject: "Our response times for {client}",
      body: "Hi,\n\nWe review service levels for every client, and our first response times for {client} have slipped recently. That is not the standard we hold ourselves to.\n\nWe have already looked at why and are making changes this week. Could we have 15 minutes to talk it through and check nothing else is getting in your way?",
    },
  },
  resolution_time_trend: {
    title: "Unblock slow resolutions",
    why: "Issues that drag on cost the client time every day they stay open, and that cost is remembered.",
    steps: [
      "Pull the slowest open tickets and find the common cause: a vendor, a skill gap or waiting on the client.",
      "Assign a named owner to clear them, with a target date for each.",
      "Tell the client what was causing the delay and what has been done about it.",
    ],
    email: {
      subject: "Getting {client}'s issues resolved faster",
      body: "Hi,\n\nIssues have been taking longer to resolve for {client} than usual. We have looked at the cause and put a named engineer on clearing the backlog.\n\nI would like to walk you through what was slowing things down and what we have changed. Do you have 15 minutes this week?",
    },
  },
  backlog_growth: {
    title: "Clear the backlog",
    why: "A growing pile of open tickets tells the client their problems are queuing behind everyone else's.",
    steps: [
      "List every open ticket for the client and close anything already done.",
      "Book a block of engineer time to clear the rest.",
      "Send the client a short list of what was closed and what remains, with dates.",
    ],
    email: {
      subject: "Open tickets for {client}",
      body: "Hi,\n\nThe number of open tickets for {client} has grown recently. We have set aside dedicated time to clear them and will send you a short summary of what has been closed and what is left, with dates.\n\nIf any of these are more urgent to you than the rest, tell me and we will start there.",
    },
  },
  ageing_tickets: {
    title: "Close the old tickets",
    why: "Tickets left open for weeks are the ones clients raise in a review as proof nobody is paying attention.",
    steps: [
      "Sort the client's open tickets by age and review the oldest five.",
      "Close, escalate or agree a new date for each one.",
      "Let the requester of each ticket know what is happening.",
    ],
    email: {
      subject: "Older open issues for {client}",
      body: "Hi,\n\nA few issues for {client} have been open longer than they should be. We are working through each one now and will update the people who raised them directly.\n\nIf there is one that matters most to you, reply and we will prioritise it.",
    },
  },
  volume_shift: {
    title: "Find out what changed",
    why: "A sudden change in ticket volume usually means something changed in the client's business before anyone told you.",
    steps: [
      "Look at what the extra or missing tickets are about: a new system, staff changes, a recurring fault.",
      "Ask the main contact what has changed on their side.",
      "Decide whether this needs a fix, a project or a change to the contract.",
    ],
    email: {
      subject: "Checking in on {client}",
      body: "Hi,\n\nWe have noticed a change in the support you have needed from us recently. Sometimes that is a sign something has changed on your side, a new system, new starters or a recurring problem.\n\nCould we have a quick call so we can make sure we are set up to support what you need now?",
    },
  },
  contact_gap: {
    title: "Re-engage a quiet client",
    why: "Clients that stop raising tickets are often working around you, or already talking to someone else.",
    steps: [
      "Check whether a key contact has left or a competitor has been in touch.",
      "Call the decision-maker, not just the usual contact.",
      "Offer a short service review to show what you have done for them this year.",
    ],
    email: {
      subject: "A quick check-in from us",
      body: "Hi,\n\nWe have heard less from {client} recently, and I wanted to make sure that is because everything is running smoothly rather than because something is getting missed.\n\nI would like to book 20 minutes to run through what we have delivered this year and what is coming up for you. When suits?",
    },
  },
  contact_gap_absolute: {
    title: "Re-engage a silent contract",
    why: "A client paying for a contract and raising nothing may not see what they are paying for.",
    steps: [
      "Confirm the contract is still in use and the contact details are current.",
      "Call the decision-maker to check in.",
      "Send a short summary of the proactive work you have done that they never see.",
    ],
    email: {
      subject: "Your service with us",
      body: "Hi,\n\nIt has been a while since we have heard from {client}. Quiet usually means things are working, but I would rather check than assume.\n\nCould we book a short call? I would also like to share a summary of the background work we have been doing for you, most of which you never see.",
    },
  },
  after_hours_volume: {
    title: "Look into out-of-hours demand",
    why: "More tickets out of hours means the client's working pattern changed, and your cover may not match it.",
    steps: [
      "Check what the out-of-hours tickets are about and who raised them.",
      "Confirm whether the client's working hours or locations have changed.",
      "Decide whether cover, monitoring or the contract needs adjusting.",
    ],
    email: {
      subject: "Support outside office hours for {client}",
      body: "Hi,\n\nMore of {client}'s requests are arriving outside office hours than before. If your working pattern has changed, I want to make sure our cover matches it.\n\nCould we have a quick call about how and when your team is working now?",
    },
  },
  contract_expiring: {
    title: "Start the renewal early",
    why: "Renewals decided at the last minute are decided on price. Start while there is time to show value.",
    steps: [
      "Book a review with the decision-maker at least 60 days before the end date.",
      "Prepare a service review showing what you delivered and prevented this year.",
      "Bring a renewal proposal to the meeting, not after it.",
    ],
    email: {
      subject: "Planning ahead for {client}",
      body: "Hi,\n\nYour agreement with us is coming up for renewal. Before then I would like to sit down and review the past year: what we delivered, what we prevented and what you need from us next.\n\nCould we book an hour in the next few weeks?",
    },
  },
  contract_vs_usage: {
    title: "Review the contract against usage",
    why: "A client using far more than their contract covers is costing you margin. One using far less may question the price.",
    steps: [
      "Compare the work delivered with what the contract includes.",
      "Decide whether to reprice, rescope or show the value being delivered.",
      "Raise it at the next review with the numbers in hand.",
    ],
    email: {
      subject: "Making sure your agreement fits {client}",
      body: "Hi,\n\nWe have been reviewing how {client} uses our services against your current agreement. I want to make sure what you pay for matches what you need.\n\nCould we find 30 minutes to go through it together?",
    },
  },
  top_client_service_decline: {
    title: "Protect a top account",
    why: "Service slipping on one of your largest clients puts the most revenue at risk.",
    steps: [
      "Have the account owner and service lead review this client together this week.",
      "Fix the specific service issue and assign a senior escalation contact.",
      "Call the decision-maker personally to say what you have done.",
    ],
    email: {
      subject: "Your service from us",
      body: "Hi,\n\nYou are one of our most important clients, and service for {client} has not been at its best recently. I wanted you to hear that from me before you had to raise it.\n\nWe have already made changes and I have assigned a senior contact for anything urgent. Could we speak this week?",
    },
  },
  unowned_account: {
    title: "Give the account an owner",
    why: "When nobody owns an account, nobody notices it slipping.",
    steps: [
      "Assign a named owner for this client in your PSA.",
      "Ask the owner to introduce themselves to the main contact.",
      "Add the client to that owner's regular review list.",
    ],
    email: {
      subject: "Your named contact at our team",
      body: "Hi,\n\nI wanted to introduce myself as your named contact for {client}. If anything is not working as it should, or you are planning changes we should know about, I am the person to call.\n\nIt would be good to have a short intro call. When suits you?",
    },
  },
  high_value_unowned: {
    title: "Assign an owner to a high-value account",
    why: "A large account with no owner is the most expensive kind of blind spot.",
    steps: [
      "Assign a senior owner for this client in your PSA today.",
      "Have them book an introduction with the decision-maker.",
      "Review the account's open tickets and contract together.",
    ],
    email: {
      subject: "Your named contact at our team",
      body: "Hi,\n\nI am now your named contact for {client}, and I would like to make sure we are giving you the attention an account like yours deserves.\n\nCould we have a short call to introduce myself and hear what matters most to you this year?",
    },
  },
  contact_concentration: {
    title: "Widen the relationship",
    why: "If one person raises everything, losing that person can lose you the account.",
    steps: [
      "Find out who else at the client relies on your service and who signs the contract.",
      "Introduce yourself to the decision-maker if you have not met.",
      "Invite two or three other people to the next service review.",
    ],
    email: {
      subject: "Your next service review",
      body: "Hi,\n\nMost of {client}'s requests come through one person. To make sure we are meeting everyone's needs, I would like to invite a couple of other colleagues to your next service review.\n\nWho else would it be useful to include?",
    },
  },
  project_overrun: {
    title: "Get the project back on track",
    why: "Late projects are remembered long after the go-live.",
    steps: [
      "Agree a realistic new date with the project lead.",
      "Tell the client before they ask, with the reason and the new plan.",
      "Send a short weekly update until it is delivered.",
    ],
    email: {
      subject: "Project update for {client}",
      body: "Hi,\n\nI want to be upfront that work for {client} has run past its target date. We have agreed a revised plan and I will send you a short update every week until it is delivered.\n\nHappy to talk it through if useful.",
    },
  },
  data_quality: {
    title: "Fix the service data",
    why: "Missing timestamps mean you cannot prove service levels when a client challenges them.",
    steps: [
      "Check the ticket workflow records response and completion times.",
      "Remind engineers to update tickets as they work.",
      "Re-run the scan in a fortnight to confirm coverage has improved.",
    ],
    email: { subject: "", body: "" },
  },
  quote_acceptance_drop: {
    title: "Find out why quotes are being declined",
    why: "Fewer accepted quotes can mean budget pressure, or that someone else is quoting too.",
    steps: [
      "Review the declined or ignored quotes and look for a pattern.",
      "Ask the decision-maker how they are planning spend this year.",
      "Adjust what you propose, and when, based on what you hear.",
    ],
    email: {
      subject: "Planning ahead with {client}",
      body: "Hi,\n\nI would like to understand how {client} is planning IT spend for the year ahead, so the recommendations we bring you fit your priorities and budget.\n\nCould we have 20 minutes in the next couple of weeks?",
    },
  },
  quote_value_at_stake: {
    title: "Follow up the open quotes",
    why: "Expired quotes are work the client wanted at some point. Find out what happened.",
    steps: [
      "List the expired quotes and check whether the need still exists.",
      "Call the requester to ask what held it up.",
      "Reissue, rescope or close each one.",
    ],
    email: {
      subject: "Following up on our proposals",
      body: "Hi,\n\nA few of our proposals for {client} expired without a decision. I wanted to check whether the need is still there, or whether something changed.\n\nHappy to rework any of them to fit where you are now.",
    },
  },
  quote_stalled: {
    title: "Unstick the waiting quotes",
    why: "Quotes that sit unanswered usually need a conversation, not another reminder.",
    steps: [
      "Find out who needs to approve each quote.",
      "Call rather than email to ask what is needed to decide.",
      "Offer a smaller first phase if budget is the blocker.",
    ],
    email: {
      subject: "Our proposal for {client}",
      body: "Hi,\n\nOur proposal for {client} has been waiting for a while. Is there anything you need from us to make a decision, or would a smaller first phase be easier to approve?",
    },
  },
  order_gap: {
    title: "Check in on spending",
    why: "A client that has stopped ordering may be buying elsewhere.",
    steps: [
      "Check when they last ordered and what they usually buy.",
      "Ask the main contact about upcoming hardware and licence needs.",
      "Offer to plan the next quarter's purchases with them.",
    ],
    email: {
      subject: "Planning {client}'s upcoming needs",
      body: "Hi,\n\nIt has been a while since {client} last ordered through us. I would like to help plan any upcoming hardware, licence or project needs so nothing catches you out.\n\nCould we book a short call?",
    },
  },
  order_value_drop: {
    title: "Understand the drop in orders",
    why: "Falling order value can mean budget cuts, or a competitor taking some of the work.",
    steps: [
      "Compare recent orders with what they used to buy.",
      "Ask the decision-maker about budget and plans for the year.",
      "Bring a short roadmap of what you would recommend next.",
    ],
    email: {
      subject: "Planning the year ahead with {client}",
      body: "Hi,\n\nI would like to understand {client}'s plans and budget for the year ahead, so our recommendations are the right size and timing for you.\n\nCould we find 30 minutes?",
    },
  },
};

export function getSavePlay(type: string): SavePlay | null {
  return (PLAYS as Record<string, SavePlay>)[type] ?? null;
}

/** True when a play has a client-facing email worth sending. */
export function playHasEmail(play: SavePlay): boolean {
  return play.email.body.trim().length > 0;
}

/** Fill a play's email for one client. */
export function buildSavePlayEmail(
  play: SavePlay,
  input: { clientName: string; senderName: string },
): { subject: string; body: string } {
  const fill = (text: string) =>
    text
      .replaceAll("{client}", input.clientName)
      .replaceAll("{sender}", input.senderName.trim() || "The team");
  return {
    subject: fill(play.email.subject),
    body: fill(play.email.body + SIGN_OFF),
  };
}
