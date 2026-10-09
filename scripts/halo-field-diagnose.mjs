/**
 * One-off field diagnosis for Panacea Halo instance.
 * Run: npx tsx --tsconfig tsconfig.json scripts/halo-field-diagnose.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, scryptSync } from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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
  const key = scryptSync(keyStr, "salt", 32);
  const [ivHex, encryptedHex] = text.split(":");
  if (!ivHex || !encryptedHex) {
    const CryptoJS = require("crypto-js");
    return CryptoJS.AES.decrypt(text, keyStr).toString(CryptoJS.enc.Utf8);
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function getHaloToken({ haloUrl, tenant, clientId, clientSecret }) {
  const base = haloUrl.trim().replace(/\/+$/, "");
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
  const data = await res.json();
  return { token: data.access_token, base };
}

async function resolveConnection() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: conns } = await supabase
    .from("halo_connections")
    .select("halo_url, tenant, client_id, client_secret_encrypted, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);
  for (const conn of conns ?? []) {
    try {
      const clientSecret = decrypt(conn.client_secret_encrypted);
      return await getHaloToken({
        haloUrl: conn.halo_url,
        tenant: conn.tenant,
        clientId: conn.client_id,
        clientSecret,
      });
    } catch {
      continue;
    }
  }
  throw new Error("No working connection");
}

function isDateLikeKey(k) {
  return /date|time|occurred|respond|close|open|deadline|target|fixby|start|end|posted|update|action/i.test(k);
}

function redactContract(record) {
  const copy = structuredClone(record);
  const redact = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      const kl = k.toLowerCase();
      if (
        kl.includes("client_name") ||
        kl === "clientname" ||
        kl === "name" && typeof v === "string" && v.length > 2
      ) {
        obj[k] = "[REDACTED]";
      } else if (kl === "client" && v && typeof v === "object") {
        if ("name" in v) v.name = "[REDACTED]";
      } else if (Array.isArray(v)) {
        v.forEach(redact);
      } else if (v && typeof v === "object") {
        redact(v);
      }
    }
  };
  redact(copy);
  if (typeof copy.client_name === "string") copy.client_name = "[REDACTED]";
  return copy;
}

async function main() {
  const { token, base } = await resolveConnection();
  const headers = { Authorization: `Bearer ${token}` };

  // --- Ticket field dump (open + closed samples) ---
  const ticketSamples = [];
  for (const id of [3433, 12, 131]) {
    const r = await fetch(`${base}/api/Tickets/${id}`, { headers });
    if (r.ok) ticketSamples.push(await r.json());
  }
  if (ticketSamples.length === 0) {
    const ticketUrl = new URL(`${base}/api/Tickets`);
    ticketUrl.searchParams.set("datesearch", "dateoccurred");
    ticketUrl.searchParams.set("startdate", "2025-08-26");
    ticketUrl.searchParams.set("enddate", "2026-08-26");
    ticketUrl.searchParams.set("count", "1");
    const tRes = await fetch(ticketUrl.toString(), { headers });
    const tJson = await tRes.json();
    const tickets = Array.isArray(tJson) ? tJson : tJson.tickets ?? tJson.Tickets ?? [];
    if (tickets[0]) ticketSamples.push(tickets[0]);
  }

  for (const [i, raw] of ticketSamples.entries()) {
    const keys = Object.keys(raw).sort();
    const dateKeys = keys.filter(isDateLikeKey);
    console.log(`\n=== RAW TICKET #${i + 1} (id=${raw.id}): ALL KEYS ===`);
    console.log(JSON.stringify(keys, null, 2));
    console.log(`\n=== RAW TICKET #${i + 1}: DATE/TIME FIELDS ===`);
    const dateFields = {};
    for (const k of dateKeys) dateFields[k] = raw[k];
    console.log(JSON.stringify(dateFields, null, 2));
  }

  const allTicketKeys = [...new Set(ticketSamples.flatMap((t) => Object.keys(t)))].sort();
  console.log("\n=== UNION OF ALL TICKET KEYS (across samples) ===");
  console.log(JSON.stringify(allTicketKeys, null, 2));

  // --- ClientContract dump (3 records) ---
  const cUrl = new URL(`${base}/api/ClientContract`);
  cUrl.searchParams.set("paginate", "true");
  cUrl.searchParams.set("page_size", "100");
  cUrl.searchParams.set("page_no", "1");
  cUrl.searchParams.set("includeinactive", "false");
  cUrl.searchParams.set("includedetails", "true");
  const cRes = await fetch(cUrl.toString(), { headers });
  const cJson = await cRes.json();
  const contracts = Array.isArray(cJson)
    ? cJson
    : cJson.contracts ?? cJson.clientcontracts ?? cJson.ClientContract ?? [];

  console.log("\n=== CLIENT CONTRACT: 3 RAW RECORDS (client names redacted) ===");
  for (const [i, rec] of contracts.slice(0, 3).entries()) {
    console.log(`\n--- Record ${i + 1} ---`);
    console.log(JSON.stringify(redactContract(rec), null, 2));
  }

  const withPlans = contracts.filter((c) => c.billingplans ?? c.billing_plans);
  const nonZero = contracts.filter((c) => (c.periodchargeamount ?? 0) > 0);
  console.log("\n=== CLIENT CONTRACT: PAGE STATS ===");
  console.log(`  total on page: ${contracts.length}`);
  console.log(`  with billingplans/billing_plans key: ${withPlans.length}`);
  console.log(`  periodchargeamount > 0: ${nonZero.length}`);
  if (contracts[0]) {
    console.log(`  sample keys: ${Object.keys(contracts[0]).sort().join(", ")}`);
  }

  // Probe other revenue endpoints (status only)
  const probes = [
    "/api/RecurringInvoice?pageinate=true&page_size=1&page_no=1",
    "/api/RecurringInvoices?pageinate=true&page_size=1&page_no=1",
    "/api/Invoice?pageinate=true&page_size=1&page_no=1",
    "/api/Invoices?pageinate=true&page_size=1&page_no=1",
    "/api/ContractAddition?pageinate=true&page_size=1&page_no=1",
    "/api/ContractAdditions?pageinate=true&page_size=1&page_no=1",
    "/api/ClientContractSchedule?pageinate=true&page_size=1&page_no=1",
  ];
  console.log("\n=== REVENUE ENDPOINT PROBES (status + record_count) ===");
  for (const path of probes) {
    try {
      const u = `${base}${path}`;
      const r = await fetch(u, { headers });
      let body = null;
      try {
        body = await r.json();
      } catch {
        body = null;
      }
      const rows = Array.isArray(body)
        ? body
        : body?.invoices ?? body?.contracts ?? body?.records ?? body?.data ?? [];
      const rc =
        body?.record_count ?? body?.recordCount ?? (Array.isArray(rows) ? rows.length : null);
      console.log(`${path.split("?")[0]} → HTTP ${r.status}, record_count≈${rc ?? "n/a"}`);
    } catch (e) {
      console.log(`${path.split("?")[0]} → error: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
