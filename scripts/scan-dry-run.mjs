/**
 * PSA scan dry-run (read-only, stores nothing).
 * Uses stored Panacea Halo connection via Supabase halo_connections (or HALO_* env).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/scan-dry-run.mjs
 *   npx tsx --tsconfig tsconfig.json scripts/scan-dry-run.mjs --from-csv clients.csv tickets.csv contracts.csv
 * Optional:
 *   HALO_USER_ID=<uuid>  — pick a specific connection
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, scryptSync } from "crypto";
import { createRequire } from "module";
import {
  getHaloTickets,
  haloScanTicketHasFreeText,
  mapTicket,
} from "../src/lib/halo.ts";
import {
  getHaloContracts,
  getHaloRecurringInvoices,
  normaliseHaloContractRow,
} from "../src/lib/psa/contracts.ts";
import { getHaloCommercialData } from "../src/lib/psa/commercial.ts";
import {
  aggregateByClientPeriod,
  portfolioCoverageFromAggregates,
} from "../src/lib/psa/scan-aggregate.ts";
import { FieldProvenanceAccumulator } from "../src/lib/psa/halo-field-provenance.ts";
import { buildScanFindings } from "../src/lib/psa/scan-findings.ts";

const require = createRequire(import.meta.url);

function csvPathsFromArgs() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--from-csv");
  if (index < 0) return null;
  const paths = args.slice(index + 1).filter((value) => !value.startsWith("--"));
  const named = ["clients", "tickets", "contracts"].map((name) => {
    const flagIndex = args.indexOf(`--${name}`);
    return flagIndex >= 0 ? args[flagIndex + 1] : null;
  });
  if (named.every((value) => value && !value.startsWith("--"))) {
    return { clients: named[0], tickets: named[1], contracts: named[2] };
  }
  if (paths.length !== 3) {
    throw new Error(
      "Usage: node scripts/scan-dry-run.mjs --from-csv clients.csv tickets.csv contracts.csv (or use --clients, --tickets, and --contracts)",
    );
  }
  return { clients: paths[0], tickets: paths[1], contracts: paths[2] };
}

function readCsv(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) throw new Error(`CSV file not found: ${resolved}`);
  const Papa = require("papaparse");
  const parsed = Papa.parse(fs.readFileSync(resolved, "utf8"), {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors?.length) {
    throw new Error(`${resolved}: ${parsed.errors[0].message}`);
  }
  return parsed.data.filter((row) => row && typeof row === "object");
}

function emptyAsUndefined(value) {
  if (value == null || String(value).trim() === "") return undefined;
  return String(value).trim();
}

function numberOrUndefined(value) {
  const text = emptyAsUndefined(value);
  if (text == null) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function booleanOrUndefined(value) {
  const text = emptyAsUndefined(value)?.toLowerCase();
  if (text == null) return undefined;
  if (["true", "1", "yes"].includes(text)) return true;
  if (["false", "0", "no"].includes(text)) return false;
  return undefined;
}

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvLocal();

function decrypt(text) {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) throw new Error("ENCRYPTION_KEY is not set.");
  const key = scryptSync(keyStr, "salt", 32);
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) {
    const CryptoJS = require("crypto-js");
    const bytes = CryptoJS.AES.decrypt(text, keyStr);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

function normalizeBase(url) {
  return url.trim().replace(/\/+$/, "");
}

function hostOf(url) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).host;
  } catch {
    return url;
  }
}

async function getHaloToken({ haloUrl, tenant, clientId, clientSecret }) {
  const base = normalizeBase(haloUrl);
  const tokenUrl = new URL(`${base}/auth/token`);
  if (tenant?.trim()) tokenUrl.searchParams.set("tenant", tenant.trim());
  const res = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "all",
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`auth/token ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("auth/token: no access_token");
  return data.access_token;
}

async function resolveConnection() {
  if (
    process.env.HALO_URL?.trim() &&
    process.env.HALO_CLIENT_ID?.trim() &&
    process.env.HALO_CLIENT_SECRET?.trim()
  ) {
    const token = await getHaloToken({
      haloUrl: process.env.HALO_URL,
      tenant: process.env.HALO_TENANT || null,
      clientId: process.env.HALO_CLIENT_ID,
      clientSecret: process.env.HALO_CLIENT_SECRET,
    });
    return {
      token,
      haloUrl: normalizeBase(process.env.HALO_URL),
      authSource: "env",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or HALO_* env)",
    );
  }
  if (!process.env.ENCRYPTION_KEY) throw new Error("Need ENCRYPTION_KEY");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let q = supabase
    .from("halo_connections")
    .select("user_id, halo_url, tenant, client_id, client_secret_encrypted, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (process.env.HALO_USER_ID?.trim()) {
    q = q.eq("user_id", process.env.HALO_USER_ID.trim());
  }
  const { data: conns, error } = await q;
  if (error) throw new Error(`halo_connections: ${error.message}`);
  if (!conns?.length) throw new Error("No halo_connections rows found");

  for (const conn of conns) {
    let clientSecret;
    try {
      clientSecret = decrypt(conn.client_secret_encrypted);
    } catch {
      continue;
    }
    try {
      const token = await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
      return {
        token,
        haloUrl: normalizeBase(conn.halo_url),
        authSource: `halo_connections user_id=${conn.user_id}`,
      };
    } catch {
      continue;
    }
  }
  throw new Error("No working Halo connection found.");
}

function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addUtcDays(d, days) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Last 12 months ending today UTC, split into four ~91-day quarters. */
function buildQuarterWindows() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = addUtcDays(end, -365);
  const totalDays = 365;
  const chunk = Math.ceil(totalDays / 4);
  const windows = [];
  for (let i = 0; i < 4; i += 1) {
    const from = addUtcDays(start, i * chunk);
    const to = i === 3 ? end : addUtcDays(start, (i + 1) * chunk - 1);
    windows.push({ dateFrom: ymd(from), dateTo: ymd(to) });
  }
  return { start: ymd(start), end: ymd(end), windows };
}

function peakMemoryMb() {
  const mu = process.memoryUsage();
  return {
    heapUsedMb: Math.round((mu.heapUsed / 1024 / 1024) * 10) / 10,
    rssMb: Math.round((mu.rss / 1024 / 1024) * 10) / 10,
  };
}

function ticketsToScanInput(tickets) {
  return tickets.map((t) => ({
    clientId:
      typeof t.clientId === "number" && t.clientId > 0
        ? t.clientId
        : Number(t.client?.id ?? 0),
    dateEntered: t.dateoccurred ?? null,
    dateResponded: t.dateresponded ?? null,
    dateClosed: t.dateclosed ?? null,
    targetDate: t.targetdate ?? null,
    priority: t.scanAttributes?.priority ?? null,
    statusOpen:
      t.scanAttributes?.statusOpen ??
      (t.scanAttributes?.hasBeenClosed == null ? null : !t.scanAttributes.hasBeenClosed),
    owner: t.scanAttributes?.owner ?? null,
    requester: t.scanAttributes?.requester ?? null,
    ticketType: t.scanAttributes?.ticketType ?? null,
    slaDueDate: t.scanAttributes?.slaDueDate ?? null,
  }));
}

function printFieldMapping(fieldMapping) {
  if (!fieldMapping) {
    console.log("  (no field mapping captured)");
    return;
  }
  for (const field of [
    "dateEntered",
    "dateResponded",
    "dateClosed",
    "targetDate",
    "priority",
    "statusOpen",
    "assignedOwner",
    "requester",
    "ticketType",
    "slaDueDate",
  ]) {
    const r = fieldMapping[field];
    console.log(`  ${field}:`);
    console.log(`    confidence: ${r.confidence}${r.confidenceReason ? ` (${r.confidenceReason})` : ""}`);
    console.log(`    histogram:  ${JSON.stringify(r.histogram)}`);
    console.log(
      `    dominant:   ${r.dominantSourceKey ?? "n/a"} (${r.dominantSourcePct}% of matched, ${r.matchedTickets}/${r.totalTickets} matched, ${r.impliedEventWithoutDate} implied-without-date)`,
    );
  }
}

async function fetchHistoricalWindow(token, haloUrl, dateFrom, dateTo, fetchMeta) {
  const tickets = await getHaloTickets(token, haloUrl, {
    dateFrom,
    dateTo,
    includeClosed: true,
    minimalHistoricalPayload: true,
    captureFieldProvenance: true,
    fetchMeta,
  });
  const payloadBytes = Buffer.byteLength(JSON.stringify(tickets), "utf8");
  return { tickets, payloadBytes, recordCount: fetchMeta.recordCount };
}

function isActiveCsvContract(row) {
  const active = booleanOrUndefined(row.active);
  const status = emptyAsUndefined(row.contract_status)?.toLowerCase() ?? "";
  if (active === false) return false;
  return !["inactive", "cancelled", "canceled", "expired"].some((value) =>
    status.includes(value),
  );
}

function runCsvPipeline(csv) {
  const clientRows = readCsv(csv.clients);
  const ticketRows = readCsv(csv.tickets);
  const contractRows = readCsv(csv.contracts);
  const clientNames = new Map();
  const activeClientIds = new Set();

  for (const row of clientRows) {
    const id = numberOrUndefined(row.id);
    if (id == null || id <= 0) continue;
    const inactive = booleanOrUndefined(row.inactive);
    if (inactive !== true) activeClientIds.add(id);
    const name = emptyAsUndefined(row.name);
    if (name) clientNames.set(id, name);
  }

  const fieldProvenance = new FieldProvenanceAccumulator();
  const mappedTickets = ticketRows.map((row) =>
    mapTicket(
      {
        id: numberOrUndefined(row.id),
        client_id: numberOrUndefined(row.client_id),
        summary: emptyAsUndefined(row.summary),
        dateoccurred: emptyAsUndefined(row.dateoccurred),
        responsedate: emptyAsUndefined(row.responsedate),
        dateclosed: emptyAsUndefined(row.dateclosed),
        date_fully_closed: emptyAsUndefined(row.date_fully_closed),
        hasbeenclosed: booleanOrUndefined(row.hasbeenclosed),
        status_id: numberOrUndefined(row.status_id),
        agent_id: numberOrUndefined(row.agent_id),
        user_id: numberOrUndefined(row.user_id),
        priority_id: numberOrUndefined(row.priority_id),
        tickettype_id: numberOrUndefined(row.tickettype_id),
        targetdate: emptyAsUndefined(row.targetdate),
      },
      null,
      { fieldProvenance, capturePerTicketProvenance: true },
    ),
  );
  const fieldMapping = fieldProvenance.buildReports();
  const scanTickets = ticketsToScanInput(mappedTickets);
  const projects = mappedTickets
    .filter((ticket) => ticket.is_project === true)
    .map((ticket) => ({ clientId: ticket.clientId ?? 0, targetDate: ticket.targetdate ?? null }));
  const contracts = contractRows
    .filter(isActiveCsvContract)
    .map((row) => normaliseHaloContractRow({
      id: numberOrUndefined(row.id),
      client_id: numberOrUndefined(row.client_id),
      ref: emptyAsUndefined(row.ref),
      contracttype_name: emptyAsUndefined(row.contracttype_name),
      start_date: emptyAsUndefined(row.start_date),
      end_date: emptyAsUndefined(row.end_date),
      billingperiod: emptyAsUndefined(row.billingperiod),
      periodchargeamount: emptyAsUndefined(row.periodchargeamount),
      active: booleanOrUndefined(row.active),
      contract_status: emptyAsUndefined(row.contract_status),
    }))
    .filter((contract) => contract != null);
  const byClient = aggregateByClientPeriod(scanTickets, projects, { fieldMapping });
  const findingsResult = buildScanFindings({
    byClient,
    tickets: scanTickets,
    contracts,
    fieldMapping,
    clientNames: Object.fromEntries(clientNames),
  });

  return {
    clientNames,
    activeClientIds,
    mappedTickets,
    scanTickets,
    contracts,
    fieldMapping,
    findingsResult,
  };
}

function printCsvReport(csv) {
  const result = runCsvPipeline(csv);
  const { findingsResult } = result;
  const grouped = new Map();
  for (const finding of findingsResult.findings) {
    const group = grouped.get(finding.clientId) ?? {
      name: result.clientNames.get(finding.clientId) ?? `Client #${finding.clientId}`,
      findings: [],
    };
    group.findings.push(finding);
    grouped.set(finding.clientId, group);
  }

  console.log("=== PSA scan dry-run (CSV, read-only) ===");
  console.log(`clients_csv:   ${path.resolve(process.cwd(), csv.clients)}`);
  console.log(`tickets_csv:   ${path.resolve(process.cwd(), csv.tickets)}`);
  console.log(`contracts_csv: ${path.resolve(process.cwd(), csv.contracts)}`);
  console.log(`tickets mapped: ${result.mappedTickets.length}`);
  console.log(`contracts mapped: ${result.contracts.length}`);
  console.log("");

  console.log("--- Field provenance histograms ---");
  printFieldMapping(result.fieldMapping);
  console.log("");

  console.log("--- Findings grouped by client ---");
  if (grouped.size === 0) {
    console.log("  (no findings emitted)");
  } else {
    for (const [clientId, group] of grouped) {
      console.log(`${group.name} (#${clientId}):`);
      const findings = group.findings;
      for (const [index, finding] of findings.entries()) {
        console.log(
          `  ${index + 1}. type=${finding.type} confidence=${finding.confidence}` +
          `${finding.monthlyValue != null ? ` monthlyValue=£${finding.monthlyValue}` : ""}`,
        );
        console.log(`     raw=${JSON.stringify(finding)}`);
      }
    }
  }
  console.log("");

  console.log("--- Portfolio stats and exposure ---");
  console.log(JSON.stringify(findingsResult.portfolio, null, 2));
  console.log("");

  const findingClientIds = new Set(findingsResult.findings.map((finding) => finding.clientId));
  const noFindings = [...result.activeClientIds]
    .filter((id) => !findingClientIds.has(id))
    .map((id) => `${result.clientNames.get(id) ?? `Client #${id}`} (#${id})`);
  console.log("--- Clients with no findings ---");
  console.log(noFindings.length > 0 ? noFindings.join("\n") : "  (none)");
}

async function main() {
  const csv = csvPathsFromArgs();
  if (csv) {
    printCsvReport(csv);
    return;
  }
  const t0 = Date.now();
  const { token, haloUrl, authSource } = await resolveConnection();
  const { start, end, windows } = buildQuarterWindows();

  console.log("=== PSA scan dry-run (read-only) ===");
  console.log(`auth: ${authSource}`);
  console.log(`halo_host: ${hostOf(haloUrl)}`);
  console.log(`window: ${start} → ${end} (12 months UTC)`);
  console.log("");

  let peakPayloadBytes = 0;
  let peakHeapMb = 0;

  const seqMeta = { recordCount: null, fetchPath: null, fieldMapping: null };
  const seqStart = performance.now();
  const seq = await fetchHistoricalWindow(token, haloUrl, start, end, seqMeta);
  const seqMs = Math.round(performance.now() - seqStart);
  peakPayloadBytes = Math.max(peakPayloadBytes, seq.payloadBytes);
  peakHeapMb = Math.max(peakHeapMb, peakMemoryMb().heapUsedMb);

  const freeTextTickets = seq.tickets.filter((t) => haloScanTicketHasFreeText(t));
  const withProvenance = seq.tickets.filter((t) => t.fieldProvenance).length;

  console.log("--- Tickets: sequential 12-month fetch (scan path) ---");
  console.log(`  halo record_count (page 1): ${seqMeta.recordCount ?? "n/a"}`);
  console.log(`  fetch path:                 ${seqMeta.fetchPath ?? "unknown"}`);
  console.log(`  tickets fetched:            ${seq.tickets.length}`);
  console.log(`  wall time:                  ${seqMs} ms`);
  console.log(`  payload size:               ${(seq.payloadBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `  free-text check:            ${freeTextTickets.length} tickets with disallowed text (expect 0)`,
  );
  console.log(`  per-ticket provenance:      ${withProvenance} tickets (dry-run only)`);
  console.log("");

  console.log("--- Field mapping (source-key histograms) ---");
  printFieldMapping(seqMeta.fieldMapping);
  console.log("");

  const scanTickets = ticketsToScanInput(seq.tickets);
  const byClient = aggregateByClientPeriod(scanTickets, [], {
    fieldMapping: seqMeta.fieldMapping ?? undefined,
  });
  const ticketCountsByClient = {};
  for (const t of scanTickets) {
    if (t.clientId > 0) {
      ticketCountsByClient[t.clientId] = (ticketCountsByClient[t.clientId] ?? 0) + 1;
    }
  }
  const portfolio = portfolioCoverageFromAggregates(
    byClient,
    ticketCountsByClient,
    seqMeta.fieldMapping,
  );

  console.log("--- Coverage (field-gated) ---");
  console.log(
    `  portfolio response coverage:  ${portfolio.responseCoveragePct ?? "SUPPRESSED"}${portfolio.responseCoverageSuppressReason ? ` (${portfolio.responseCoverageSuppressReason})` : ""}`,
  );
  console.log(
    `  portfolio close coverage:     ${portfolio.closeCoveragePct ?? "SUPPRESSED"}${portfolio.closeCoverageSuppressReason ? ` (${portfolio.closeCoverageSuppressReason})` : ""}`,
  );
  console.log(
    `  client response spread:       ${portfolio.clientResponseCoverageSpread.min}% – ${portfolio.clientResponseCoverageSpread.max}%`,
  );
  console.log(
    `  clients with suppressed response metric: ${portfolio.suppressedResponseMetricClients} / ${Object.keys(byClient).length}`,
  );
  console.log("");

  const parStart = performance.now();
  const quarterResults = await Promise.all(
    windows.map(async (w, i) => {
      const meta = { recordCount: null, fetchPath: null, fieldMapping: null };
      const r = await fetchHistoricalWindow(token, haloUrl, w.dateFrom, w.dateTo, meta);
      return { quarter: i + 1, window: w, ...r, recordCount: meta.recordCount };
    }),
  );
  const parMs = Math.round(performance.now() - parStart);
  const parPayloadBytes = quarterResults.reduce((s, q) => s + q.payloadBytes, 0);
  for (const q of quarterResults) {
    peakPayloadBytes = Math.max(peakPayloadBytes, q.payloadBytes);
  }
  peakHeapMb = Math.max(peakHeapMb, peakMemoryMb().heapUsedMb);

  console.log("--- Tickets: four parallel quarters ---");
  for (const q of quarterResults) {
    console.log(
      `  Q${q.quarter} ${q.window.dateFrom}→${q.window.dateTo}: record_count=${q.recordCount ?? "n/a"} fetched=${q.tickets.length}`,
    );
  }
  console.log(`  wall time (parallel): ${parMs} ms`);
  console.log(`  speedup vs sequential: ${(seqMs / Math.max(parMs, 1)).toFixed(2)}×`);
  console.log("");

  let contractRecords = [];
  let contractSummary = null;
  let contractError = null;
  try {
    const contracts = await getHaloContracts(token, haloUrl);
    contractRecords = contracts.records;
    contractSummary = contracts.summary;
    peakHeapMb = Math.max(peakHeapMb, peakMemoryMb().heapUsedMb);
  } catch (e) {
    contractError = e instanceof Error ? e.message : String(e);
  }
  let recurringInvoiceRecords = [];
  let recurringInvoiceMapping = null;
  let recurringInvoiceError = null;
  try {
    const recurring = await getHaloRecurringInvoices(token, haloUrl);
    recurringInvoiceRecords = recurring.records;
    recurringInvoiceMapping = recurring.fieldMapping;
    peakHeapMb = Math.max(peakHeapMb, peakMemoryMb().heapUsedMb);
  } catch (e) {
    recurringInvoiceError = e instanceof Error ? e.message : String(e);
  }
  let quotations;
  let salesOrders;
  let commercialFieldMapping = null;
  let commercialError = null;
  try {
    const commercial = await getHaloCommercialData(token, haloUrl);
    quotations = commercial.quotations;
    salesOrders = commercial.salesOrders;
    commercialFieldMapping = commercial.fieldMapping;
    peakHeapMb = Math.max(peakHeapMb, peakMemoryMb().heapUsedMb);
  } catch (e) {
    commercialError = e instanceof Error ? e.message : String(e);
  }

  const findingsResult = buildScanFindings({
    byClient,
    tickets: scanTickets,
    contracts: contractRecords,
    recurringInvoices: recurringInvoiceError ? [] : recurringInvoiceRecords,
    quotations,
    salesOrders,
    fieldMapping: seqMeta.fieldMapping,
  });

  console.log("--- Findings (ranked) ---");
  console.log(
    `  portfolio: ${findingsResult.portfolio.clientsWithFindings} clients with findings / ${findingsResult.portfolio.clientsAnalysed} analysed`,
  );
  console.log(`  by type: ${JSON.stringify(findingsResult.portfolio.findingsByType)}`);
  console.log(
    `  exposure: value=${findingsResult.portfolio.exposureValue ?? "null"}, coverage=${findingsResult.portfolio.exposureCoverage != null ? `${findingsResult.portfolio.exposureCoverage}%` : "null"}`,
  );
  if (findingsResult.insufficientData.length > 0) {
    console.log(
      `  insufficient_data: ${findingsResult.insufficientData.length} client(s) — ${findingsResult.insufficientData.map((c) => `#${c.clientId} (${c.reason})`).join(", ")}`,
    );
  }
  console.log("");
  if (findingsResult.findings.length === 0) {
    console.log("  (no findings emitted)");
  } else {
    for (const [i, f] of findingsResult.findings.entries()) {
      console.log(
        `  ${i + 1}. client #${f.clientId} · ${f.type} · confidence=${f.confidence}${f.monthlyValue != null ? ` · MRR=£${f.monthlyValue.toFixed(2)}` : ""}`,
      );
      for (const d of f.drivers) {
        console.log(`       • ${d.fact}`);
      }
    }
  }
  console.log("");

  console.log("--- Commercial field provenance ---");
  if (recurringInvoiceError) {
    console.log(`  RecurringInvoice ERROR: ${recurringInvoiceError}`);
  } else {
    console.log(`  RecurringInvoice rows: ${recurringInvoiceRecords.length}`);
    for (const [field, report] of Object.entries(recurringInvoiceMapping ?? {})) {
      console.log(`  RecurringInvoice.${field}: ${JSON.stringify(report.histogram)}`);
    }
  }
  if (commercialError) {
    console.log(`  Quotation/SalesOrder ERROR: ${commercialError}`);
  } else {
    for (const [entity, mapping] of Object.entries(commercialFieldMapping ?? {})) {
      console.log(`  ${entity} rows: ${entity === "quotations" ? quotations?.length ?? 0 : salesOrders?.length ?? 0}`);
      for (const [field, report] of Object.entries(mapping)) {
        console.log(`  ${entity}.${field}: ${JSON.stringify(report.histogram)}`);
      }
    }
  }
  console.log("");

  console.log("--- Contracts (ClientContract) ---");
  if (contractError) {
    console.log(`  ERROR: ${contractError}`);
  } else {
    console.log(`  total: ${contractSummary.total}, withValue: ${contractSummary.withValue}`);
  }
  console.log("");

  console.log("--- Resource peaks ---");
  console.log(`  peak payload (single fetch): ${(peakPayloadBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  peak heap used:              ${peakHeapMb} MB`);
  console.log(`  total script wall time:      ${Date.now() - t0} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
