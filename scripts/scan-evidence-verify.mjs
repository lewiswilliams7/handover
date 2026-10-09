/**
 * Read-only checks for scan evidence retention and entitlement boundaries.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/scan-evidence-verify.mjs
 */
import fs from "fs";
import path from "path";

import {
  capScanEvidence,
  parseScanEvidence,
} from "../src/lib/psa/scan-evidence.ts";
import { buildHaloScanEvidenceDeepLink } from "../src/lib/psa/scan-deep-links.ts";
import { aggregateByClientPeriod } from "../src/lib/psa/scan-aggregate.ts";
import { buildScanFindings } from "../src/lib/psa/scan-findings.ts";

const root = process.cwd();
const checks = [];

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

const refs = [
  { source: "halo", kind: "ticket", id: 2182 },
  { source: "halo", kind: "ticket", id: 2182 },
  ...Array.from({ length: 10 }, (_, index) => ({
    source: "halo",
    kind: "quote",
    id: index + 1,
  })),
  { source: "halo", kind: "project", id: 9999 },
];

check("evidence refs are deduplicated and capped at 10", capScanEvidence(refs).length === 10);
check(
  "invalid evidence refs are rejected",
  parseScanEvidence([
    ...refs,
    { source: "unknown", kind: "ticket", id: 1 },
    { source: "halo", kind: "ticket", id: -1 },
  ]).every((ref) => ref.source === "halo" && ref.id > 0),
);
check(
  "Halo ticket links use the verified ticket route",
  buildHaloScanEvidenceDeepLink("https://handoveruk.trial.usehalo.com", refs[0]) ===
    "https://handoveruk.trial.usehalo.com/ticket?id=2182",
);
check(
  "Halo quote links use the verified quotation route",
  buildHaloScanEvidenceDeepLink("https://handoveruk.trial.usehalo.com", {
    source: "halo",
    kind: "quote",
    id: 14,
  }) === "https://handoveruk.trial.usehalo.com/order?quoteid=14",
);
check(
  "non-Halo refs do not produce Halo links",
  buildHaloScanEvidenceDeepLink("https://handoveruk.trial.usehalo.com", {
    source: "connectwise",
    kind: "ticket",
    id: 1,
  }) === null,
);

const recentDate = new Date(Date.now() - 15 * 86_400_000).toISOString();
const baselineDate = new Date(Date.now() - 75 * 86_400_000).toISOString();
const smokeTickets = [
  { ticketId: 2001, clientId: 1, dateEntered: recentDate, dateResponded: null, dateClosed: null },
  { ticketId: 2002, clientId: 1, dateEntered: recentDate, dateResponded: null, dateClosed: null },
  { ticketId: 2003, clientId: 1, dateEntered: baselineDate, dateResponded: null, dateClosed: null },
];
const smokeAggregate = aggregateByClientPeriod(smokeTickets, []);
const smokeResult = buildScanFindings({
  byClient: smokeAggregate,
  tickets: smokeTickets,
  evidenceSource: "halo",
  opts: { recentMonths: 1, minBaselineMonths: 1, minTicketsForBaseline: 1, volumeShiftRatio: 1.1 },
});
const smokeFinding = smokeResult.findings.find((finding) => finding.type === "volume_shift");
check(
  "generated findings retain source ticket evidence",
  smokeFinding?.evidenceIds?.some((ref) => ref.kind === "ticket" && ref.id === 2001) === true,
);

const aggregate = fs.readFileSync(
  path.join(root, "src", "lib", "psa", "scan-aggregate.ts"),
  "utf8",
);
const commercial = fs.readFileSync(
  path.join(root, "src", "lib", "psa", "commercial.ts"),
  "utf8",
);
const session = fs.readFileSync(
  path.join(root, "src", "lib", "psa", "scan-session.ts"),
  "utf8",
);
const entitlement = fs.readFileSync(
  path.join(root, "src", "lib", "scan-entitlement.ts"),
  "utf8",
);
const attention = fs.readFileSync(
  path.join(root, "src", "app", "(app)", "attention", "attention-client.tsx"),
  "utf8",
);
const results = fs.readFileSync(
  path.join(root, "src", "app", "onboarding", "results", "scan-results.tsx"),
  "utf8",
);

check("ticket and project IDs are represented in scan inputs", /ticketId:|projectId:/.test(aggregate));
check("quotation ID is represented in normalized quotations", /export type NormalisedQuotation[\s\S]*\bid:/.test(commercial));
check("anonymous result projection is reduced", entitlement.includes("if (!results || entitled) return results;"));
check("attention links open in a new tab", /target="_blank"[\s\S]*View in HaloPSA/.test(attention));
check("onboarding result links open in a new tab", /target="_blank"[\s\S]*View in HaloPSA/.test(results));

const measurementRefs = capScanEvidence(
  Array.from({ length: 10 }, (_, index) => ({
    source: "halo",
    kind: index % 2 === 0 ? "ticket" : "quote",
    id: 10_000 + index,
  })),
);
const baseFinding = {
  clientId: 1,
  type: "volume_shift",
  drivers: [],
  monthlyValue: null,
  confidence: "high",
  magnitude: 1,
};
const measureDelta = (findingsPerClient) => {
  const base = Array.from({ length: 40 * findingsPerClient }, (_, index) => ({
    ...baseFinding,
    clientId: (index % 40) + 1,
  }));
  const enriched = base.map((finding) => ({
    ...finding,
    evidenceIds: measurementRefs,
  }));
  return Buffer.byteLength(JSON.stringify({ findings: enriched })) -
    Buffer.byteLength(JSON.stringify({ findings: base }));
};

for (const findingsPerClient of [1, 3, 22]) {
  const delta = measureDelta(findingsPerClient);
  console.log(
    `STORAGE ${findingsPerClient} finding/client: +${delta} bytes (+${(delta / 1024).toFixed(1)} KiB logical JSON)`,
  );
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exit(1);
