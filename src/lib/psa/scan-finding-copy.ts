import type { FindingType } from "@/lib/psa/scan-findings";

export type FindingCopy = {
  label: string;
  description: string;
};

/** Plain-English copy for every scan check shown to an MD. */
export const FINDING_COPY: Record<FindingType, FindingCopy> = {
  volume_shift: {
    label: "Ticket volume changed",
    description: "Ticket volume changed materially compared with this account’s usual pattern.",
  },
  response_drift: {
    label: "First response time changed",
    description: "The typical time to first response changed compared with this account’s earlier pattern.",
  },
  project_overrun: {
    label: "Projects passed their target dates",
    description: "One or more projects passed their target dates during the scan period.",
  },
  contact_gap: {
    label: "Ticket activity dropped",
    description: "Recent ticket activity is materially lower than this account’s earlier pattern.",
  },
  data_quality: {
    label: "Service data is incomplete",
    description: "Some tickets are missing response or completion times, so service reporting is incomplete.",
  },
  backlog_growth: {
    label: "Open ticket backlog grew",
    description: "The number of open tickets is higher than this account’s earlier pattern.",
  },
  ageing_tickets: {
    label: "Tickets are staying open longer",
    description: "Open tickets have stayed open longer than this account’s usual completion time.",
  },
  unowned_account: {
    label: "Tickets have no assigned owner",
    description: "The account’s tickets have no assigned person responsible for them.",
  },
  contact_concentration: {
    label: "One contact raised most tickets",
    description: "One contact accounts for most of this account’s identified ticket activity.",
  },
  resolution_time_trend: {
    label: "Resolution time increased",
    description: "The typical time to complete tickets is longer than this account’s earlier pattern.",
  },
  after_hours_volume: {
    label: "More tickets arrived out of hours",
    description: "A larger share of tickets arrived outside normal working hours than in the earlier period.",
  },
  contact_gap_absolute: {
    label: "No recent activity on an active contract",
    description: "An account with an active contract has had no activity in over 60 days.",
  },
  contract_expiring: {
    label: "An active contract is ending soon",
    description: "An active contract is due to end within the next 90 days.",
  },
  contract_vs_usage: {
    label: "Ticket activity differs from contract size",
    description: "Ticket activity is materially above or below the level expected for this account’s contract value.",
  },
  top_client_service_decline: {
    label: "A high-value account’s service changed",
    description: "A high-value account has a slower response or resolution time than its own earlier pattern.",
  },
  high_value_unowned: {
    label: "A high-value account has no assigned owner",
    description: "A high-value account’s tickets have no assigned person responsible for them.",
  },
  quote_acceptance_drop: {
    label: "Quote acceptance fell",
    description: "The account accepted fewer recent quotes than it accepted in its earlier quote history.",
  },
  quote_value_at_stake: {
    label: "Unapproved quotes passed their expiry date",
    description: "One or more unapproved quotes passed their expiry date and have a combined quoted value.",
  },
  quote_stalled: {
    label: "Quotes are taking longer to decide",
    description: "Unapproved quotes have been open longer than this account’s usual decision window.",
  },
  order_gap: {
    label: "The usual ordering interval has passed",
    description: "The account has gone longer than its typical interval since its last order.",
  },
  order_value_drop: {
    label: "Order value fell",
    description: "Recent order value is below the account’s earlier 12-month ordering pattern.",
  },
};

export const PORTFOLIO_CHECK_COPY = {
  responseTimestamps: {
    label: "First response coverage",
    description: "How often a first-response time was recorded on the scanned tickets.",
  },
  closeTimestamps: {
    label: "Completion timestamp coverage",
    description: "How often a completion time was recorded on the scanned tickets.",
  },
  clientsWithoutOwner: {
    label: "Clients without an assigned owner",
    description: "Clients whose scanned tickets do not have an assigned owner.",
  },
  activeContractsWithoutActivity: {
    label: "Active contracts without ticket activity",
    description: "Clients with an active contract but no ticket activity during the scan period.",
  },
  insufficientData: {
    label: "Clients with too little history",
    description: "Clients left out of trend comparisons because the scan did not contain enough history.",
  },
  expiringContracts: {
    label: "Contracts ending soon",
    description: "Active contracts due to end within the next 90 days.",
  },
} as const;

export function getFindingCopy(type: string): FindingCopy {
  return FINDING_COPY[type as FindingType] ?? {
    label: "Measured change",
    description: "A measurable change was identified in the scanned data.",
  };
}

export function findingCountSentence(type: string, count: number): string {
  const noun = count === 1 ? "account" : "accounts";
  const has = count === 1 ? "has" : "have";
  switch (type) {
    case "volume_shift":
      return `${count} ${noun} had a material change in ticket volume compared with their usual pattern.`;
    case "response_drift":
      return `${count} ${noun} had a material change in first response time compared with their earlier pattern.`;
    case "project_overrun":
      return `${count} ${noun} had projects pass their target dates during the scan period.`;
    case "contact_gap":
      return `${count} ${noun} had materially less ticket activity than in their earlier pattern.`;
    case "data_quality":
      return `${count} ${noun} ${has} incomplete service timestamps, so service reporting is incomplete.`;
    case "backlog_growth":
      return `${count} ${noun} had more open tickets than in their earlier pattern.`;
    case "ageing_tickets":
      return `${count} ${noun} ${has} open tickets staying open longer than usual.`;
    case "contact_gap_absolute":
      return `${count} ${noun} ${count === 1 ? "has" : "have"} an active contract but ${count === 1 ? "has" : "have"} had no activity in over 60 days.`;
    case "contract_expiring":
      return `${count} ${noun} ${count === 1 ? "has" : "have"} an active contract ending within 90 days.`;
    case "unowned_account":
      return `${count} ${noun} ${count === 1 ? "has" : "have"} tickets with no assigned owner.`;
    case "contact_concentration":
      return `${count} ${noun} had most of their identified tickets raised by one contact.`;
    case "resolution_time_trend":
      return `${count} ${noun} had longer ticket completion times than in their earlier pattern.`;
    case "after_hours_volume":
      return `${count} ${noun} had more tickets arrive outside normal working hours than before.`;
    case "contract_vs_usage":
      return `${count} ${noun} had ticket activity materially different from what their contract size would suggest.`;
    case "top_client_service_decline":
      return `${count} ${noun} had slower response or resolution times in a high-value account.`;
    case "high_value_unowned":
      return `${count} ${noun} had no assigned owner in a high-value account.`;
    case "quote_acceptance_drop":
      return `${count} ${noun} accepted fewer recent quotes than in their earlier quote history.`;
    case "quote_value_at_stake":
      return `${count} ${noun} ${has} unapproved quotes past expiry with a combined quoted value.`;
    case "quote_stalled":
      return `${count} ${noun} ${has} unapproved quotes open longer than their usual decision window.`;
    case "order_gap":
      return `${count} ${noun} ${has} gone beyond their typical ordering interval.`;
    case "order_value_drop":
      return `${count} ${noun} had lower recent order value than their earlier 12-month pattern.`;
    default: {
      const copy = getFindingCopy(type);
      return `${count} ${noun} ${copy.description.charAt(0).toLowerCase()}${copy.description.slice(1)}`;
    }
  }
}

export function insufficientDataReason(reason: string): string {
  if (reason === "no_ticket_activity_in_scan_period") {
    return "No tickets were raised during the scan period.";
  }
  const ticketMatch = reason.match(/^fewer than (\d+) tickets in window$/);
  if (ticketMatch) {
    return `Fewer than ${ticketMatch[1]} tickets were available in the scan period.`;
  }
  const monthMatch = reason.match(/^fewer than (\d+) baseline months$/);
  if (monthMatch) {
    return `Fewer than ${monthMatch[1]} months of history were available for a reliable comparison.`;
  }
  return "There was not enough history for a reliable comparison.";
}
