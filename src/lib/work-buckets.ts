/**
 * The four kinds of value an MSP delivers, in the client's words. Each closed
 * ticket is placed by its category first, then its type, then its title. A
 * ticket that matches nothing stays unclassified rather than being guessed,
 * and a receipt only shows the split when most tickets could be placed.
 */
export type WorkBucket = "running" | "safe" | "forward" | "planned";

export const WORK_BUCKETS: Array<{ key: WorkBucket; label: string; blurb: string }> = [
  { key: "running", label: "Kept you running", blurb: "Fixing problems and helping people get on with their day" },
  { key: "safe", label: "Kept you safe", blurb: "Security, backups and patching" },
  { key: "forward", label: "Moved you forward", blurb: "New people, new kit, projects and changes" },
  { key: "planned", label: "Planned ahead", blurb: "Maintenance, reviews, licences and planning" },
];

type Rule = { bucket: WorkBucket; planned: boolean; pattern: RegExp };

const RULES: Rule[] = [
  { bucket: "safe", planned: true, pattern: /\b(patch\w*|backups?|back up|windows updates?|updates? (?:install|deploy)|encryption|cyber essentials|compliance|vulnerab\w*)\b/ },
  { bucket: "safe", planned: false, pattern: /\b(secur\w*|anti-?virus|malware|phish\w*|spam|mfa|2fa|multi-?factor|firewall|defender|edr|threat|ransomware|breach|suspicious|compromis\w*|virus)\b/ },
  { bucket: "forward", planned: true, pattern: /\b(projects?|new (?:user|starter|joiner|laptop|pc|device|phone|site|office)|starters?|joiners?|onboard\w*|install\w*|set ?up|deploy\w*|migrat\w*|upgrad\w*|procure\w*|purchas\w*|orders?|quotes?|change requests?|changes?|roll ?out|implement\w*)\b/ },
  { bucket: "planned", planned: true, pattern: /\b(maintenance|scheduled|planned|reviews?|audits?|health ?checks?|qbr|strategy|roadmap|renewals?|licen[cs]\w*|assets?|documentation|budget\w*|recommendation\w*)\b/ },
  { bucket: "running", planned: false, pattern: /\b(incidents?|faults?|outages?|down|not working|errors?|issues?|broken|fail\w*|crash\w*|slow|printers?|printing|passwords?|resets?|locked|log ?in|login|sign ?in|access|e-?mails?|outlook|wi-?fi|network|vpn|connect\w*|support|help|problems?|unable|cannot|can't|leavers?|disable)\b/ },
];

/** Ticket types that say enough on their own. */
const TYPE_RULES: Array<{ pattern: RegExp; bucket: WorkBucket; planned: boolean }> = [
  { pattern: /^(incident|problem|fault|break ?fix)/, bucket: "running", planned: false },
  { pattern: /^(change|project)/, bucket: "forward", planned: true },
  { pattern: /^(maintenance|preventative|scheduled)/, bucket: "planned", planned: true },
  { pattern: /^(security|alert)/, bucket: "safe", planned: false },
];

export function classifyWork(input: {
  category?: string | null;
  type?: string | null;
  summary?: string | null;
}): { bucket: WorkBucket; planned: boolean } | null {
  const category = input.category?.toLowerCase().trim();
  if (category) {
    for (const rule of RULES) if (rule.pattern.test(category)) return { bucket: rule.bucket, planned: rule.planned };
  }
  const type = input.type?.toLowerCase().trim();
  if (type) {
    for (const rule of TYPE_RULES) if (rule.pattern.test(type)) return { bucket: rule.bucket, planned: rule.planned };
  }
  const summary = input.summary?.toLowerCase().trim();
  if (summary) {
    for (const rule of RULES) if (rule.pattern.test(summary)) return { bucket: rule.bucket, planned: rule.planned };
  }
  return null;
}

export type WorkSplit = { running: number; safe: number; forward: number; planned: number; plannedWork: number };

export function emptyWorkSplit(): WorkSplit {
  return { running: 0, safe: 0, forward: 0, planned: 0, plannedWork: 0 };
}

export function addWorkSplits(splits: Array<WorkSplit | undefined>): WorkSplit {
  const total = emptyWorkSplit();
  for (const split of splits) {
    if (!split) continue;
    total.running += split.running;
    total.safe += split.safe;
    total.forward += split.forward;
    total.planned += split.planned;
    total.plannedWork += split.plannedWork;
  }
  return total;
}
