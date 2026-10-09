import fs from "node:fs";
import path from "node:path";
import { createDecipheriv, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getHaloTickets } from "../src/lib/halo";
import { getHaloContracts, type NormalisedContractRecord } from "../src/lib/psa/contracts";
import { aggregateByClientPeriod, type ScanTicketInput } from "../src/lib/psa/scan-aggregate";
import { buildScanFindings } from "../src/lib/psa/scan-findings";

for (const line of fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  const i = t.indexOf("=");
  if (!t || t.startsWith("#") || i < 0) continue;
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) throw new Error("Unsupported encrypted secret format");
  const key = scryptSync(process.env.ENCRYPTION_KEY!, "salt", 32);
  const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

async function tokenFor(connection: {
  halo_url: string;
  tenant: string | null;
  client_id: string;
  client_secret_encrypted: string;
}): Promise<string> {
  const url = new URL(`${connection.halo_url.replace(/\/+$/, "")}/auth/token`);
  if (connection.tenant?.trim()) url.searchParams.set("tenant", connection.tenant.trim());
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: connection.client_id,
      client_secret: decrypt(connection.client_secret_encrypted),
      scope: "all",
    }),
  });
  if (!response.ok) throw new Error(`auth ${response.status}`);
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("no access token");
  return json.access_token;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data: rows, error } = await supabase
  .from("halo_connections")
  .select("halo_url, tenant, client_id, client_secret_encrypted")
  .order("updated_at", { ascending: false })
  .limit(20);
if (error) throw error;
const candidateRows = (rows ?? []).filter((row) => /panacea/i.test(row.halo_url));
let connection: (typeof candidateRows)[number] | undefined;
let token = "";
for (const candidate of candidateRows) {
  try {
    token = await tokenFor(candidate);
    connection = candidate;
    break;
  } catch {
    // Try the next stored Panacea connection without printing credential details.
  }
}
if (!connection || !token) throw new Error("No working Panacea connection");

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 365);
const dateFrom = start.toISOString().slice(0, 10);
const dateTo = end.toISOString().slice(0, 10);
const fetchMeta: { recordCount: number | null; fetchPath?: "modern" | "legacy"; fieldMapping?: Record<string, unknown> } = {
  recordCount: null,
};
const tickets = await getHaloTickets(token, connection.halo_url, {
  dateFrom,
  dateTo,
  includeClosed: true,
  minimalHistoricalPayload: true,
  throwOnFetchError: true,
  fetchMeta,
});
const scanTickets: ScanTicketInput[] = tickets.map((ticket) => ({
  clientId: ticket.clientId ?? 0,
  dateEntered: ticket.dateoccurred,
  dateResponded: ticket.dateresponded ?? null,
  dateClosed: ticket.dateclosed ?? null,
  targetDate: ticket.targetdate ?? null,
  priority: ticket.scanAttributes?.priority ?? null,
  statusOpen: ticket.scanAttributes?.statusOpen ?? null,
  owner: ticket.scanAttributes?.owner ?? null,
  requester: ticket.scanAttributes?.requester ?? null,
  ticketType: ticket.scanAttributes?.ticketType ?? null,
  slaDueDate: ticket.scanAttributes?.slaDueDate ?? null,
}));
const projects = tickets
  .filter((ticket) => ticket.is_project === true)
  .map((ticket) => ({ clientId: ticket.clientId ?? 0, targetDate: ticket.targetdate ?? null }));
let contracts: NormalisedContractRecord[] | undefined;
try {
  contracts = (await getHaloContracts(token, connection.halo_url)).records;
} catch {
  contracts = undefined;
}
const byClient = aggregateByClientPeriod(scanTickets, projects, {
  fieldMapping: fetchMeta.fieldMapping as never,
});
const result = buildScanFindings({
  byClient,
  tickets: scanTickets,
  contracts,
  fieldMapping: fetchMeta.fieldMapping as never,
});

console.log(JSON.stringify({
  connectionHost: new URL(connection.halo_url).host,
  tickets: tickets.length,
  recordCount: fetchMeta.recordCount,
  fieldMapping: fetchMeta.fieldMapping,
  portfolio: result.portfolio,
  insufficientData: result.insufficientData,
  findings: result.findings,
}, null, 2));
