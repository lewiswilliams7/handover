/**
 * Focused checks for scan-to-scan finding comparison.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/scan-comparison-verify.mjs
 */
import assert from "node:assert/strict";

import {
  compareScanFindings,
  scanFindingComparisonKey,
} from "../src/lib/psa/scan-comparison.ts";

const finding = (clientId, type, magnitude = 1) => ({
  clientId,
  type,
  drivers: [],
  monthlyValue: null,
  confidence: "high",
  magnitude,
});

const currentDate = new Date("2026-08-31T12:00:00.000Z");
const previousDate = new Date("2026-08-01T12:00:00.000Z");
const previous = {
  findings: [
    finding(1, "volume_shift", 1),
    finding(2, "response_drift", 2),
    finding(3, "backlog_growth", 3),
    finding(3, "contact_gap", 4),
  ],
  clientNames: {
    "2": "Resolved Client",
    "3": "Another Resolved Client",
  },
};
const current = {
  findings: [
    finding(1, "volume_shift", 99),
    finding(4, "quote_stalled", 5),
  ],
  clientNames: {},
};

const comparison = compareScanFindings(
  current,
  previous,
  currentDate.toISOString(),
  previousDate.toISOString(),
);

assert.ok(comparison);
assert.deepEqual(comparison.newFindingKeys, [
  scanFindingComparisonKey(4, "quote_stalled"),
]);
assert.deepEqual(comparison.ongoingFindingKeys, [
  scanFindingComparisonKey(1, "volume_shift"),
]);
assert.equal(comparison.resolvedFindings.length, 3);
assert.equal(comparison.resolvedClientCount, 2);
assert.equal(comparison.resolvedClientNames["2"], "Resolved Client");
assert.equal(comparison.resolvedClientNames["3"], "Another Resolved Client");

const exactlySixtyDaysAgo = new Date(currentDate.getTime() - 60 * 86_400_000);
assert.ok(
  compareScanFindings(
    current,
    previous,
    currentDate.toISOString(),
    exactlySixtyDaysAgo.toISOString(),
  ),
);

const olderThanSixtyDays = new Date(currentDate.getTime() - 60 * 86_400_000 - 1);
assert.equal(
  compareScanFindings(
    current,
    previous,
    currentDate.toISOString(),
    olderThanSixtyDays.toISOString(),
  ),
  null,
);

assert.equal(
  compareScanFindings(
    current,
    previous,
    previousDate.toISOString(),
    currentDate.toISOString(),
  ),
  null,
);

console.log("PASS scan comparison stable matching, statuses, resolved account count, and cutoff");
