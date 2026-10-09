import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, scryptSync } from "crypto";
import { createRequire } from "module";
import { getHaloTicketStatuses, getHaloTickets } from "../src/lib/halo.ts";
import { getHaloContracts } from "../src/lib/psa/contracts.ts";
import { aggregateByClientPeriod } from "../src/lib/psa/scan-aggregate.ts";
import { buildScanFindings } from "../src/lib/psa/scan-findings.ts";

const require = createRequire(import.meta.url);
for (const line of fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  const i = t.indexOf("=");
  if (!t || t.startsWith("#") || i < 0) continue;
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

function decrypt(text) {
  const keyText = process.env.ENCRYPTION_KEY;
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) {
    return require("crypto-js").AES.decrypt(text, keyText).toString(require("crypto-js").enc.Utf8);
  }
  const decipher = createDecipheriv("aes-256-cbc", scryptSync(keyText, "salt", 32), Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

async function getConnection() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  for (const connection of data ?? []) {
    try {
      const tokenUrl = new URL(`${connection.halo_url.replace(/\/+$/, "")}/auth/token`);
      if (connection.tenant?.trim()) tokenUrl.searchParams.set("tenant", connection.tenant.trim());
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: connection.client_id,
          client_secret: decrypt(connection.client_secret_encrypted),
          scope: "all",
        }),
      });
      if (response.ok) return { connection, token: (await response.json()).access_token };
    } catch {}
  }
  throw new Error("No working Halo connection found");
}

const { connection, token } = await getConnection();
const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 365);
const fetchMeta = { recordCount: null, fieldMapping: null };
const rawTickets = await getHaloTickets(token, connection.halo_url, {
  dateFrom: ymd(start),
  dateTo: ymd(end),
  includeClosed: true,
  minimalHistoricalPayload: true,
  throwOnFetchError: true,
  fetchMeta,
});
const statuses = await getHaloTicketStatuses(connection.halo_url, token);
const statusNames = new Map(statuses.map((status) => [status.id, status.name]));
function statusNameToOpen(name) {
  const value = String(name ?? "").trim().toLowerCase();
  if (["closed", "resolved", "complete", "completed", "cancelled", "canceled"].some((term) => value.includes(term))) return false;
  if (["open", "new", "active", "in progress", "pending", "reopened"].some((term) => value.includes(term))) return true;
  return null;
}
const tickets = rawTickets.map((ticket) => ({
  clientId: ticket.clientId ?? 0,
  dateEntered: ticket.dateoccurred,
  dateResponded: ticket.dateresponded ?? null,
  dateClosed: ticket.dateclosed ?? null,
  targetDate: ticket.targetdate ?? null,
  priority: ticket.scanAttributes?.priority ?? null,
  statusOpen:
    statusNameToOpen(statusNames.get(ticket.status_id ?? -1)) ??
    ticket.scanAttributes?.statusOpen ??
    (ticket.scanAttributes?.hasBeenClosed == null ? null : !ticket.scanAttributes.hasBeenClosed),
  owner: ticket.scanAttributes?.owner ?? null,
  requester: ticket.scanAttributes?.requester ?? null,
  ticketType: ticket.scanAttributes?.ticketType ?? null,
  slaDueDate: ticket.scanAttributes?.slaDueDate ?? null,
}));
const byClient = aggregateByClientPeriod(tickets, [], { fieldMapping: fetchMeta.fieldMapping });
let contracts;
try {
  contracts = (await getHaloContracts(token, connection.halo_url)).records;
} catch {
  contracts = undefined;
}
const result = buildScanFindings({ byClient, tickets, contracts, fieldMapping: fetchMeta.fieldMapping });

console.log(`instance: ${new URL(connection.halo_url).host}`);
console.log(`tickets: ${tickets.length}`);
const statusCoverage = tickets.filter((ticket) => ticket.statusOpen != null).length;
console.log(`status_catalogue_rows: ${statuses.length}`);
console.log(`combined_status_coverage: ${statusCoverage}/${tickets.length} (${((100 * statusCoverage) / tickets.length).toFixed(1)}%)`);
console.log("field_histograms:");
for (const field of ["priority", "statusOpen", "assignedOwner", "requester", "ticketType"]) {
  const report = fetchMeta.fieldMapping?.[field];
  console.log(`${field}: matched=${report?.matchedTickets ?? 0} none=${report?.histogram?.none ?? 0} ${JSON.stringify(report?.histogram ?? {})}`);
}
console.log("check_mapping_status:");
for (const [name, fields] of Object.entries({
  backlog_growth: ["statusOpen", "dateEntered"],
  ageing_tickets: ["statusOpen", "dateClosed"],
  unowned_account: ["assignedOwner"],
  contact_concentration: ["requester"],
  resolution_time_trend: ["dateEntered", "dateClosed"],
  after_hours_volume: ["dateEntered"],
})) {
  const failed =
    fields.some((field) => fetchMeta.fieldMapping?.[field]?.confidence === "failed") ||
    (fields.includes("statusOpen") && statusCoverage / tickets.length < 0.7);
  console.log(`${name}: ${failed ? "suppressed because status coverage is below 70%" : "could fire if thresholds and volume are met"}`);
}
console.log(`findings_total: ${result.findings.length}`);
console.log("findings:");
for (const [index, finding] of result.findings.entries()) {
  console.log(`${index + 1}. client=${finding.clientId} type=${finding.type} confidence=${finding.confidence}`);
  for (const driver of finding.drivers) console.log(`   ${driver.fact}`);
}
