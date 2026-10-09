/**
 * Throwaway HaloPSA commercial/ticket coverage check (read-only).
 * Auth resolution order:
 *   1. HALO_URL + HALO_TENANT + HALO_CLIENT_ID + HALO_CLIENT_SECRET
 *      (process environment wins over .env.local)
 *   2. Supabase service role → halo_connections → decrypt secret
 *      (optionally filtered by HALO_USER_ID)
 *   Both paths use OAuth2 client_credentials POST /auth/token.
 *
 * Usage:
 *   node scripts/halo-coverage-check.mjs
 * Optional:
 *   HALO_URL=<url>
 *   HALO_TENANT=<tenant>
 *   HALO_CLIENT_ID=<id>
 *   HALO_CLIENT_SECRET=<secret>
 *     — use direct credentials instead of halo_connections
 *   HALO_USER_ID=<uuid>  — pick a specific DB connection when direct
 *                          credentials are not supplied
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  createDecipheriv,
  scryptSync,
} from "crypto";
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

function redactCredentialValues(text, credentials) {
  let safe = String(text ?? "");
  for (const value of [credentials?.clientSecret, credentials?.clientId]) {
    if (typeof value === "string" && value.length > 0) {
      safe = safe.split(value).join("[REDACTED]");
    }
  }
  return safe;
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
    throw new Error(
      `auth/token ${res.status}: ${redactCredentialValues(body, { clientId, clientSecret }).slice(0, 300)}`,
    );
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("auth/token: no access_token");
  return data.access_token;
}

function unwrapList(data, preferredKeys = []) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const k of preferredKeys) {
    if (Array.isArray(data[k])) return data[k];
  }
  for (const k of [
    "quotations",
    "quotation",
    "salesorders",
    "salesorder",
    "invoices",
    "invoice",
    "opportunities",
    "opportunity",
    "contracts",
    "contract",
    "clientcontracts",
    "tickets",
    "projects",
    "clients",
    "result",
    "data",
    "records",
  ]) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

function recordCount(data, rows) {
  if (data && typeof data === "object") {
    const n =
      data.record_count ??
      data.recordCount ??
      data.total ??
      data.TotalRecordCount ??
      data.recordcount;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return rows.length;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractErrorDetail(status, statusText, text, json, headers) {
  const parts = [];
  if (statusText) parts.push(statusText);
  const msg =
    (json &&
      (json.message ||
        json.Message ||
        json.error ||
        json.error_description ||
        json.title ||
        json.detail)) ||
    null;
  if (msg) parts.push(String(msg));
  const stripped = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== String(msg || "")) parts.push(stripped.slice(0, 300));
  const www = headers?.get?.("www-authenticate");
  if (www) parts.push(`www-authenticate: ${www}`);
  const haloPerm = headers?.get?.("x-halo-permission") || headers?.get?.("x-permission");
  if (haloPerm) parts.push(`permission: ${haloPerm}`);
  if (!parts.length) {
    return `HTTP ${status} (empty body — typically missing Halo application permission for this endpoint)`;
  }
  return parts.join(" | ").slice(0, 400);
}

async function haloGet(base, token, apiPath, params = {}) {
  const url = new URL(`${base}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const detail = res.ok
    ? ""
    : extractErrorDetail(res.status, res.statusText, text, json, res.headers);
  return {
    status: res.status,
    ok: res.ok,
    text: text.slice(0, 500),
    detail,
    json,
    url: url.toString(),
  };
}

async function fetchAllPages(base, token, apiPath, { pageSize = 100, maxPages = 200, extraParams = {}, listKeys = [] } = {}) {
  const all = [];
  let page = 1;
  let apiReportedTotal = null;
  let firstKeys = null;
  let firstSample = null;
  let lastStatus = 200;
  let lastErrorBody = "";

  while (page <= maxPages) {
    const { status, ok, json, text, detail } = await haloGet(base, token, apiPath, {
      pageinate: "true",
      page_size: pageSize,
      page_no: page,
      ...extraParams,
    });
    lastStatus = status;
    if (!ok) {
      lastErrorBody = detail || text;
      return {
        error: true,
        status,
        body: lastErrorBody,
        rows: all,
        firstKeys,
        firstSample,
        apiReportedTotal,
      };
    }
    const rows = unwrapList(json, listKeys);
    if (page === 1) {
      apiReportedTotal = recordCount(json, rows);
      if (rows[0] && typeof rows[0] === "object") {
        firstKeys = Object.keys(rows[0]).sort();
        firstSample = rows[0];
      }
    }
    all.push(...rows);
    if (rows.length === 0 || rows.length < pageSize) break;
    if (apiReportedTotal != null && all.length >= apiReportedTotal) break;
    page += 1;
    await sleep(120);
  }

  return {
    error: false,
    status: lastStatus,
    rows: all,
    firstKeys,
    firstSample,
    apiReportedTotal,
    lastErrorBody,
  };
}

function asObj(row) {
  return row && typeof row === "object" ? row : {};
}

function redactClientNames(value, parentKey = "") {
  if (Array.isArray(value)) {
    return value.map((item) => redactClientNames(item, parentKey));
  }
  if (!value || typeof value !== "object") {
    return typeof value === "string" &&
      (parentKey.toLowerCase() === "client" ||
        /(client|company).*name/i.test(parentKey))
      ? "[REDACTED]"
      : value;
  }
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    const isClientName =
      lowerKey === "client_name" ||
      lowerKey === "clientname" ||
      lowerKey === "companyname" ||
      (parentKey.toLowerCase() === "client" && lowerKey === "name");
    output[key] = isClientName
      ? "[REDACTED]"
      : redactClientNames(child, key);
  }
  return output;
}

function clientIdOf(row) {
  const o = asObj(row);
  const candidates = [
    o.client_id,
    o.clientid,
    o.ClientID,
    o.toplevel_id,
    o.toplevelid,
    typeof o.client === "object" && o.client ? o.client.id : null,
    typeof o.client === "number" ? o.client : null,
  ];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function pickDateFields(keys) {
  return (keys || []).filter((k) => /date|time|created|closed|start|end|occurred|response|fix|quoted|ordered|invoiced/i.test(k));
}

function parseDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // Halo sometimes uses .NET ticks or unix ms
    if (v > 1e12) return new Date(v);
    if (v > 1e9) return new Date(v * 1000);
  }
  const s = String(v).trim();
  if (!s || s.startsWith("0001")) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function firstUsableDate(row, fieldNames) {
  const o = asObj(row);
  for (const f of fieldNames) {
    const d = parseDate(o[f]);
    if (d) return { field: f, date: d };
  }
  return null;
}

function inLastMonths(d, months, now) {
  if (!d) return false;
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  return d >= start && d <= now;
}

function pct(n, d) {
  if (!d) return "0.0%";
  return `${((100 * n) / d).toFixed(1)}%`;
}

function printTable(title, rows) {
  console.log("");
  console.log(`=== ${title} ===`);
  if (!rows.length) {
    console.log("(empty)");
    return;
  }
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  console.log(cols.map((c, i) => c.padEnd(widths[i])).join("  "));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) {
    console.log(cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i])).join("  "));
  }
}

function reportPermissionError(label, status, body) {
  printTable(label, [
    {
      result: "ERROR",
      http_status: status,
      detail: String(body || "")
        .replace(/\s+/g, " ")
        .slice(0, 240),
    },
  ]);
}

/** Try endpoint path variants; return first success + all attempt statuses. */
async function fetchFirstWorking(base, token, paths, opts = {}) {
  const attempts = [];
  for (const apiPath of paths) {
    const r = await fetchAllPages(base, token, apiPath, opts);
    attempts.push({
      endpoint: apiPath,
      http_status: r.status,
      detail: r.error ? String(r.body || "").slice(0, 200) : "ok",
    });
    if (!r.error) return { r, endpoint: apiPath, attempts };
  }
  const last = attempts[attempts.length - 1];
  return {
    r: {
      error: true,
      status: last?.http_status ?? 0,
      body: attempts
        .map((a) => `${a.endpoint} → ${a.http_status}: ${a.detail}`)
        .join(" || "),
      rows: [],
      firstKeys: null,
      apiReportedTotal: null,
    },
    endpoint: null,
    attempts,
  };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid url)";
  }
}

async function main() {
  const now = new Date();
  const start12 = new Date(now);
  start12.setMonth(start12.getMonth() - 12);
  const start90 = new Date(now);
  start90.setDate(start90.getDate() - 90);

  let token = null;
  let base = null;
  let authSource = null;

  const directCredentialKeys = [
    "HALO_URL",
    "HALO_CLIENT_ID",
    "HALO_CLIENT_SECRET",
  ];
  const partialDirectOverride = directCredentialKeys.some((key) =>
    process.env[key]?.trim(),
  );
  const hasDirectOverride =
    directCredentialKeys.every((key) => process.env[key]?.trim());

  // Direct credentials always win. A partial override fails closed rather than
  // silently falling back to a potentially stale halo_connections row.
  if (partialDirectOverride && !hasDirectOverride) {
    const missing = directCredentialKeys.filter((key) => !process.env[key]?.trim());
    throw new Error(
      `Incomplete direct Halo override. Set ${missing.join(", ")} or clear all HALO_URL/HALO_CLIENT_ID/HALO_CLIENT_SECRET variables.`,
    );
  }

  if (hasDirectOverride) {
    console.log("AUTH PATH");
    console.log(
      "  process environment/.env.local HALO_* override → POST {haloUrl}/auth/token (client_credentials, scope=all)",
    );
    console.log(
      "  resolution: complete direct override takes precedence over halo_connections",
    );
    console.log(`  halo_host: ${hostOf(process.env.HALO_URL)}`);
    console.log(
      `  tenant: ${process.env.HALO_TENANT?.trim() ? "(set)" : "(none)"}`,
    );
    console.log(`  window: last 12 months (client-side date filter unless noted)`);
    token = await getHaloToken({
      haloUrl: process.env.HALO_URL,
      tenant: process.env.HALO_TENANT || null,
      clientId: process.env.HALO_CLIENT_ID,
      clientSecret: process.env.HALO_CLIENT_SECRET,
    });
    base = normalizeBase(process.env.HALO_URL);
    authSource = "env";
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      throw new Error(
        "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or HALO_URL/HALO_CLIENT_ID/HALO_CLIENT_SECRET)",
      );
    }
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("Need ENCRYPTION_KEY");
    }

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

    console.log("AUTH PATH");
    console.log(
      "  Supabase service role → halo_connections → decrypt(client_secret_encrypted) → POST {haloUrl}/auth/token (client_credentials, scope=all)",
    );
    console.log(
      "  resolution: HALO_USER_ID filter when supplied, otherwise newest halo_connections rows",
    );
    console.log(`  candidates: ${conns.length}`);
    console.log(`  window: last 12 months (client-side date filter unless noted)`);

    const attempts = [];
    for (const conn of conns) {
      let clientSecret;
      try {
        clientSecret = decrypt(conn.client_secret_encrypted);
      } catch (e) {
        attempts.push({
          user_id: conn.user_id,
          halo_host: hostOf(conn.halo_url),
          has_tenant: !!(conn.tenant && String(conn.tenant).trim()),
          result: `decrypt_failed: ${e instanceof Error ? e.message : e}`,
        });
        continue;
      }
      try {
        token = await getHaloToken({
          haloUrl: conn.halo_url,
          tenant: conn.tenant,
          clientId: conn.client_id,
          clientSecret,
        });
        base = normalizeBase(conn.halo_url);
        authSource = `halo_connections user_id=${conn.user_id}`;
        attempts.push({
          user_id: conn.user_id,
          halo_host: hostOf(conn.halo_url),
          has_tenant: !!(conn.tenant && String(conn.tenant).trim()),
          result: "ok",
        });
        break;
      } catch (e) {
        attempts.push({
          user_id: conn.user_id,
          halo_host: hostOf(conn.halo_url),
          has_tenant: !!(conn.tenant && String(conn.tenant).trim()),
          result: e instanceof Error ? e.message.slice(0, 180) : String(e).slice(0, 180),
        });
      }
    }
    printTable("Auth attempts (credentials redacted)", attempts);
    if (!token || !base) {
      throw new Error(
        "No working Halo connection. Re-save Halo credentials in-app, or set HALO_URL / HALO_CLIENT_ID / HALO_CLIENT_SECRET.",
      );
    }
    console.log(`  authenticated: ${authSource}`);
    console.log(`  halo_host: ${hostOf(base)}`);
  }

  // ---------- 1 Quotation ----------
  {
    const { r, endpoint, attempts } = await fetchFirstWorking(
      base,
      token,
      ["/api/Quotation", "/api/Quotations", "/api/Quote"],
      { listKeys: ["quotations", "quotation", "quotes"] },
    );
    if (r.error) {
      printTable("1. Quotation — endpoint attempts", attempts);
      reportPermissionError("1. Quotation", r.status, r.body);
    } else {
      const dateKeys = pickDateFields(r.firstKeys);
      const quoteDateCandidates = [
        "quotedate",
        "quote_date",
        "date",
        "created_date",
        "createddate",
        "datetime",
        "datecreated",
        "date_created",
        "lastmodified",
        "last_modified",
        "accepteddate",
        "expirydate",
        ...dateKeys,
      ];
      const uniqDateCandidates = [...new Set(quoteDateCandidates)];

      const withUsableDate = r.rows.filter((row) => firstUsableDate(row, uniqDateCandidates));
      const in12 = withUsableDate.filter((row) => {
        const hit = firstUsableDate(row, uniqDateCandidates);
        return hit && inLastMonths(hit.date, 12, now);
      });
      const useRows = in12.length ? in12 : r.rows; // if no dates, report all with note
      const filtered = in12.length > 0;

      const byStatus = new Map();
      const clients = new Set();
      for (const row of useRows) {
        const o = asObj(row);
        const st =
          o.quote_status ??
          o.quotestatus ??
          o.status ??
          o.status_id ??
          o.quotestatus_name ??
          "(blank)";
        const key = String(st);
        byStatus.set(key, (byStatus.get(key) || 0) + 1);
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
      }

      printTable("1. Quotation — summary", [
        { metric: "endpoint_used", value: endpoint },
        { metric: "http_status", value: r.status },
        {
          metric: filtered ? "rows_last_12m_with_usable_date" : "rows_all_fetched_no_usable_date_filter",
          value: useRows.length,
        },
        { metric: "api_reported_total_unfiltered", value: r.apiReportedTotal ?? "" },
        { metric: "rows_fetched_unfiltered", value: r.rows.length },
        { metric: "rows_with_any_usable_date_field", value: withUsableDate.length },
        { metric: "distinct_clients_in_reported_set", value: clients.size },
        {
          metric: "quotation_header_date_fields_present",
          value: dateKeys.join(", ") || "(none matched name heuristic)",
        },
        {
          metric: "quotation_header_all_keys",
          value: (r.firstKeys || []).join(", "),
        },
      ]);
      console.log("1. Quotation — two raw records (client names redacted)");
      for (const row of useRows.slice(0, 2)) {
        console.log(JSON.stringify(redactClientNames(row), null, 2));
      }
      printTable(
        "1. Quotation — by quote_status (reported set)",
        [...byStatus.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([quote_status, count]) => ({ quote_status, count })),
      );
    }
  }

  // ---------- 2 SalesOrder ----------
  {
    const { r, endpoint, attempts } = await fetchFirstWorking(
      base,
      token,
      ["/api/SalesOrder", "/api/SalesOrders", "/api/Order"],
      { listKeys: ["salesorders", "salesorder", "orders"] },
    );
    if (r.error) {
      printTable("2. SalesOrder — endpoint attempts", attempts);
      reportPermissionError("2. SalesOrder", r.status, r.body);
    } else {
      const dateKeys = pickDateFields(r.firstKeys);
      const dateCandidates = [
        "orderdate",
        "order_date",
        "date",
        "created_date",
        "createddate",
        "datecreated",
        "datetime",
        ...dateKeys,
      ];
      const in12 = r.rows.filter((row) => {
        const hit = firstUsableDate(row, dateCandidates);
        return hit && inLastMonths(hit.date, 12, now);
      });
      const useRows = in12.length ? in12 : r.rows;
      const clients = new Set();
      let toplevelPopulated = 0;
      let withValue = 0;
      for (const row of useRows) {
        const o = asObj(row);
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
        const tl = o.toplevel_id ?? o.toplevelid ?? o.top_level_id;
        if (tl != null && String(tl).trim() !== "" && Number(tl) !== 0) toplevelPopulated += 1;
        const val =
          o.total ??
          o.ordertotal ??
          o.order_total ??
          o.value ??
          o.net_value ??
          o.netvalue ??
          o.amount ??
          o.grandtotal;
        const n = typeof val === "number" ? val : Number(val);
        if (Number.isFinite(n) && n !== 0) withValue += 1;
      }
      printTable("2. SalesOrder", [
        { metric: "endpoint_used", value: endpoint },
        { metric: "http_status", value: r.status },
        {
          metric: in12.length ? "rows_last_12m" : "rows_all_fetched_no_date_filter",
          value: useRows.length,
        },
        { metric: "api_reported_total_unfiltered", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "toplevel_id_populated", value: toplevelPopulated },
        { metric: "toplevel_id_populated_pct", value: pct(toplevelPopulated, useRows.length) },
        { metric: "rows_with_numeric_value", value: withValue },
        { metric: "rows_with_numeric_value_pct", value: pct(withValue, useRows.length) },
        { metric: "header_keys", value: (r.firstKeys || []).join(", ") },
      ]);
    }
  }

  // ---------- 3 Invoice ----------
  {
    const { r, endpoint, attempts } = await fetchFirstWorking(
      base,
      token,
      ["/api/Invoice", "/api/Invoices"],
      { listKeys: ["invoices", "invoice"] },
    );
    if (r.error) {
      printTable("3. Invoice — endpoint attempts", attempts);
      reportPermissionError("3. Invoice", r.status, r.body);
    } else {
      const dateKeys = pickDateFields(r.firstKeys);
      const dateCandidates = [
        "invoicedate",
        "invoice_date",
        "date",
        "created_date",
        "createddate",
        "datecreated",
        "datetime",
        ...dateKeys,
      ];
      const in12 = r.rows.filter((row) => {
        const hit = firstUsableDate(row, dateCandidates);
        return hit && inLastMonths(hit.date, 12, now);
      });
      const useRows = in12.length ? in12 : r.rows;
      const clients = new Set();
      let withClientRef = 0;
      for (const row of useRows) {
        const cid = clientIdOf(row);
        if (cid) {
          clients.add(cid);
          withClientRef += 1;
        }
      }
      printTable("3. Invoice", [
        { metric: "endpoint_used", value: endpoint },
        { metric: "http_status", value: r.status },
        {
          metric: in12.length ? "rows_last_12m" : "rows_all_fetched_no_date_filter",
          value: useRows.length,
        },
        { metric: "api_reported_total_unfiltered", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "rows_with_client_reference", value: withClientRef },
        {
          metric: "rows_with_client_reference_pct",
          value: pct(withClientRef, useRows.length),
        },
        { metric: "header_keys", value: (r.firstKeys || []).join(", ") },
      ]);
    }
  }

  // ---------- 4 RecurringInvoice ----------
  {
    const { r, endpoint, attempts } = await fetchFirstWorking(
      base,
      token,
      ["/api/RecurringInvoice", "/api/RecurringInvoices"],
      { listKeys: ["recurringinvoices", "recurringinvoice"] },
    );
    if (r.error) {
      printTable("4. RecurringInvoice — endpoint attempts", attempts);
      reportPermissionError("4. RecurringInvoice", r.status, r.body);
    } else {
      const valueCandidates = [
        "monthly_value",
        "monthlyvalue",
        "recurring_monthly",
        "recurringmonthly",
        "periodchargeamount",
        "amount",
        "total",
        "revenue",
        "recurring_value",
        "value",
      ];
      const presentValueFields = valueCandidates.filter((field) =>
        (r.firstKeys || []).includes(field),
      );
      printTable("4. RecurringInvoice", [
        { metric: "endpoint_used", value: endpoint },
        { metric: "http_status", value: r.status },
        { metric: "rows_fetched", value: r.rows.length },
        { metric: "api_reported_total_unfiltered", value: r.apiReportedTotal ?? "" },
        {
          metric: "recurring_value_fields_present",
          value: presentValueFields.join(", ") || "(none)",
        },
        { metric: "header_keys", value: (r.firstKeys || []).join(", ") },
      ]);
    }
  }

  // ---------- 5 Opportunities ----------
  {
    const { r, endpoint, attempts } = await fetchFirstWorking(
      base,
      token,
      ["/api/Opportunities", "/api/Opportunity"],
      { listKeys: ["opportunities", "opportunity"] },
    );
    if (r.error) {
      printTable("4. Opportunities — endpoint attempts", attempts);
      reportPermissionError("4. Opportunities", r.status, r.body);
    } else {
      const dateKeys = pickDateFields(r.firstKeys);
      const dateCandidates = [
        "date",
        "created_date",
        "createddate",
        "datecreated",
        "opendate",
        "closedate",
        "estimatedclosedate",
        ...dateKeys,
      ];
      const in12 = r.rows.filter((row) => {
        const hit = firstUsableDate(row, dateCandidates);
        return hit && inLastMonths(hit.date, 12, now);
      });
      const useRows = in12.length ? in12 : r.rows;
      const clients = new Set();
      for (const row of useRows) {
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
      }
      printTable("4. Opportunities", [
        { metric: "endpoint_used", value: endpoint },
        {
          metric: in12.length ? "rows_last_12m" : "rows_all_fetched_no_date_filter",
          value: useRows.length,
        },
        { metric: "api_reported_total_unfiltered", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "header_keys", value: (r.firstKeys || []).join(", ") },
      ]);
    }
  }

  // ---------- 5 Contract (try /Contract then /ClientContract) ----------
  {
    let r = await fetchAllPages(base, token, "/api/Contract", {
      listKeys: ["contracts", "contract"],
    });
    let endpointUsed = "/api/Contract";
    if (r.error && (r.status === 404 || r.status === 403)) {
      const r2 = await fetchAllPages(base, token, "/api/ClientContract", {
        listKeys: ["contracts", "contract", "clientcontracts"],
      });
      if (!r2.error) {
        r = r2;
        endpointUsed = "/api/ClientContract (fallback; /api/Contract failed)";
      } else {
        printTable("5. Contract", [
          {
            endpoint: "/api/Contract",
            http_status: r.status,
            detail: String(r.body || "").replace(/\s+/g, " ").slice(0, 200),
          },
          {
            endpoint: "/api/ClientContract",
            http_status: r2.status,
            detail: String(r2.body || "").replace(/\s+/g, " ").slice(0, 200),
          },
        ]);
        r = null;
      }
    }
    if (r && r.error) {
      reportPermissionError("5. Contract", r.status, r.body);
    } else if (r) {
      const endFields = [
        "end_date",
        "enddate",
        "EndDate",
        "contract_end",
        "expirydate",
        "expiry_date",
        "terminationdate",
        "date_end",
      ];
      const dateKeys = pickDateFields(r.firstKeys);
      let withEnd = 0;
      let live = 0;
      let voided = 0;
      let nonZeroPeriodCharge = 0;
      const clients = new Set();
      // Contracts often aren't "last 12 months created" — report all + end-date coverage
      for (const row of r.rows) {
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
        if (firstUsableDate(row, [...endFields, ...dateKeys.filter((k) => /end|expir/i.test(k))])) {
          withEnd += 1;
        }
        const o = asObj(row);
        const status = String(o.contract_status ?? o.status ?? "").trim().toLowerCase();
        if (status === "live") live += 1;
        if (status === "void") voided += 1;
        const periodCharge = Number(o.periodchargeamount);
        if (Number.isFinite(periodCharge) && periodCharge !== 0) {
          nonZeroPeriodCharge += 1;
        }
      }
      printTable("5. Contract", [
        { metric: "endpoint_used", value: endpointUsed },
        { metric: "http_status", value: r.status },
        { metric: "rows_total_fetched", value: r.rows.length },
        { metric: "api_reported_total", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "status_live", value: live },
        { metric: "status_void", value: voided },
        { metric: "non_zero_periodchargeamount", value: nonZeroPeriodCharge },
        { metric: "rows_with_end_date_populated", value: withEnd },
        {
          metric: "rows_with_end_date_pct",
          value: pct(withEnd, r.rows.length),
        },
        { metric: "header_keys", value: (r.firstKeys || []).join(", ") },
      ]);
    }
  }

  // ---------- 6 Tickets ----------
  {
    const ticketFields =
      "id,client_id,clientid,client_name,dateoccurred,datecreated,dateclosed,date_fully_closed," +
      "first_responsedate,responsedate,dateresponded,dateresolved," +
      "respondbydate,first_respond_by_date,fixbydate,lastactiondate,last_update";
    // Prefer server-side date window if Halo accepts it (same params as app client)
    let r = await fetchAllPages(base, token, "/api/Tickets", {
      pageSize: 100,
      maxPages: 500,
      extraParams: {
        dateFrom: start12.toISOString().slice(0, 10),
        dateopen: start12.toISOString().slice(0, 10),
        dateTo: now.toISOString().slice(0, 10),
        includedetails: "true",
        fields: ticketFields,
      },
      listKeys: ["tickets"],
    });
    if (r.error) {
      r = await fetchAllPages(base, token, "/api/Tickets", {
        pageSize: 100,
        maxPages: 500,
        extraParams: {
          includedetails: "true",
          fields: ticketFields,
        },
        listKeys: ["tickets"],
      });
    }
    if (r.error) {
      reportPermissionError("6. Tickets", r.status, r.body);
    } else {
      // Created = open timestamp. First response / close = actual event times only
      // (exclude SLA targets: respondbydate, first_respond_by_date, fixbydate).
      const createdFields = [
        "dateoccurred",
        "date_occurred",
        "datecreated",
        "created_date",
        "createddate",
        "datetimeopened",
        "opened_date",
      ];
      const firstRespFields = [
        "first_responsedate",
        "responsedate",
        "dateresponded",
        "firstresponse",
        "firstresponsedate",
        "date_responded",
      ];
      const closeFields = [
        "dateclosed",
        "date_closed",
        "closeddate",
        "closed_date",
        "datetimeclosed",
        "date_fully_closed",
        "dateresolved",
      ];
      const keys = r.firstKeys || [];
      // Union keys across rows (Halo omits null date fields from individual tickets)
      const keyUnion = new Set(keys);
      for (const row of r.rows) {
        for (const k of Object.keys(asObj(row))) keyUnion.add(k);
      }
      const presentCreated = createdFields.filter((f) => keyUnion.has(f));
      const presentResp = firstRespFields.filter((f) => keyUnion.has(f));
      const presentClose = closeFields.filter((f) => keyUnion.has(f));
      const slaTargetsPresent = [
        "respondbydate",
        "first_respond_by_date",
        "fixbydate",
      ].filter((f) => keyUnion.has(f));

      // Filter to 12m on created if possible
      let rows = r.rows;
      const withCreated = rows.filter((row) => firstUsableDate(row, createdFields));
      const in12 = withCreated.filter((row) => {
        const hit = firstUsableDate(row, createdFields);
        return hit && inLastMonths(hit.date, 12, now);
      });
      if (in12.length) rows = in12;

      const respFieldCounts = presentResp.map((f) => {
        let n = 0;
        for (const row of rows) {
          if (parseDate(asObj(row)[f])) n += 1;
        }
        return `${f}:${n}`;
      });
      const closeFieldCounts = presentClose.map((f) => {
        let n = 0;
        for (const row of rows) {
          if (parseDate(asObj(row)[f])) n += 1;
        }
        return `${f}:${n}`;
      });

      let nCreated = 0;
      let nResp = 0;
      let nClose = 0;
      const clients = new Set();
      for (const row of rows) {
        if (firstUsableDate(row, createdFields)) nCreated += 1;
        if (firstUsableDate(row, firstRespFields)) nResp += 1;
        if (firstUsableDate(row, closeFields)) nClose += 1;
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
      }

      printTable("6. Tickets (12 months where filterable)", [
        { metric: "rows", value: rows.length },
        { metric: "api_reported_total_on_fetch", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "pct_usable_created_timestamp", value: pct(nCreated, rows.length) },
        { metric: "pct_usable_first_response_timestamp", value: pct(nResp, rows.length) },
        { metric: "pct_usable_close_timestamp", value: pct(nClose, rows.length) },
        {
          metric: "created_fields_on_payload",
          value: presentCreated.join(", ") || "(none of known names)",
        },
        {
          metric: "first_response_fields_on_payload",
          value: presentResp.join(", ") || "(none of known names)",
        },
        {
          metric: "first_response_usable_by_field",
          value: respFieldCounts.join(", ") || "(none)",
        },
        {
          metric: "close_fields_on_payload",
          value: presentClose.join(", ") || "(none of known names)",
        },
        {
          metric: "close_usable_by_field",
          value: closeFieldCounts.join(", ") || "(none)",
        },
        {
          metric: "sla_target_fields_present_not_used_as_actuals",
          value: slaTargetsPresent.join(", ") || "(none)",
        },
        { metric: "header_date_like_keys", value: pickDateFields([...keyUnion]).join(", ") },
      ]);
    }
  }

  // ---------- 7 Projects ----------
  {
    const r = await fetchAllPages(base, token, "/api/Projects", {
      listKeys: ["projects", "project"],
      extraParams: { includecompleted: "true" },
    });
    if (r.error) {
      reportPermissionError("7. Projects", r.status, r.body);
    } else {
      const endFields = [
        "targetdate",
        "enddate",
        "end_date",
        "completiondate",
        "completeddate",
        "datecompleted",
        "deadline",
      ];
      const startFields = ["startdate", "start_date", "dateoccurred", "createddate"];
      const in12 = r.rows.filter((row) => {
        const hit = firstUsableDate(row, startFields);
        return hit && inLastMonths(hit.date, 12, now);
      });
      const useRows = in12.length ? in12 : r.rows;
      let withEnd = 0;
      const clients = new Set();
      for (const row of useRows) {
        if (firstUsableDate(row, endFields)) withEnd += 1;
        const cid = clientIdOf(row);
        if (cid) clients.add(cid);
      }
      printTable("7. Projects", [
        {
          metric: in12.length ? "rows_last_12m_by_start" : "rows_all_fetched",
          value: useRows.length,
        },
        { metric: "api_reported_total", value: r.apiReportedTotal ?? "" },
        { metric: "distinct_clients", value: clients.size },
        { metric: "pct_with_end_date_populated", value: pct(withEnd, useRows.length) },
        { metric: "header_keys", value: (r.firstKeys || []).slice(0, 40).join(", ") },
      ]);
    }
  }

  // ---------- 8 Clients ----------
  {
    let r = await fetchAllPages(base, token, "/api/Clients", {
      listKeys: ["clients"],
      extraParams: {
        includeinactive: "true",
        fields: "id,name,is_account,toplevel_id,toplevelid,parent_id,inactive,site_id",
      },
      pageSize: 100,
      maxPages: 100,
    });
    let clientsEndpoint = "/api/Clients";
    if (r.error && (r.status === 404 || r.status === 405)) {
      const r2 = await fetchAllPages(base, token, "/api/Client", {
        listKeys: ["clients", "client"],
        extraParams: {
          includeinactive: "true",
          fields: "id,name,is_account,toplevel_id,toplevelid,parent_id,inactive,site_id",
        },
        pageSize: 100,
        maxPages: 100,
      });
      if (!r2.error) {
        r = r2;
        clientsEndpoint = "/api/Client (fallback)";
      }
    }
    if (r.error) {
      reportPermissionError("8. Clients", r.status, r.body);
    } else {
      let topLevel = 0;
      let child = 0;
      let unknown = 0;
      let isAccountTrue = 0;
      let isAccountFalse = 0;
      let isAccountMissing = 0;
      const topLevelIds = new Set();
      const allClientIds = new Set();
      for (const row of r.rows) {
        const o = asObj(row);
        const id = Number(o.id);
        if (Number.isFinite(id)) allClientIds.add(id);

        if (o.is_account === true) isAccountTrue += 1;
        else if (o.is_account === false) isAccountFalse += 1;
        else isAccountMissing += 1;

        const tlRaw = o.toplevel_id ?? o.toplevelid ?? o.top_level_id;
        const tlNum = tlRaw == null || tlRaw === "" ? null : Number(tlRaw);
        const hasTl = tlNum != null && Number.isFinite(tlNum) && tlNum > 0;

        // Halo: top-level accounts often is_account=true; sites/children have
        // toplevel_id pointing at parent (≠ self) or is_account=false.
        const isTop =
          o.is_account === true ||
          o.toplevel === true ||
          o.is_toplevel === true ||
          o.istoplevel === true ||
          (hasTl && Number.isFinite(id) && tlNum === id) ||
          (!hasTl &&
            o.is_account !== false &&
            o.toplevel !== false &&
            (o.parent_id == null || Number(o.parent_id) === 0));
        const isChild =
          o.is_account === false ||
          o.toplevel === false ||
          o.is_toplevel === false ||
          (hasTl && Number.isFinite(id) && tlNum !== id) ||
          (o.parent_id != null && Number(o.parent_id) > 0);

        if (isTop && !isChild) {
          topLevel += 1;
          if (Number.isFinite(id)) topLevelIds.add(id);
        } else if (isChild && !isTop) {
          child += 1;
        } else if (isTop && isChild) {
          // Prefer is_account when signals conflict
          if (o.is_account === true) {
            topLevel += 1;
            if (Number.isFinite(id)) topLevelIds.add(id);
          } else {
            child += 1;
          }
        } else {
          unknown += 1;
          if (Number.isFinite(id)) topLevelIds.add(id);
        }
      }

      // Active contracts
      let contractClientIds = new Set();
      let cRes = await fetchAllPages(base, token, "/api/ClientContract", {
        listKeys: ["contracts", "contract", "clientcontracts"],
      });
      if (cRes.error) {
        cRes = await fetchAllPages(base, token, "/api/Contract", {
          listKeys: ["contracts", "contract"],
        });
      }
      if (!cRes.error) {
        for (const row of cRes.rows) {
          const o = asObj(row);
          const inactive =
            o.inactive === true ||
            o.active === false ||
            String(o.status || "").toLowerCase().includes("inact");
          const end = firstUsableDate(row, [
            "end_date",
            "enddate",
            "expirydate",
            "expiry_date",
          ]);
          const ended = end && end.date < now;
          if (inactive || ended) continue;
          const cid = clientIdOf(row);
          if (cid) contractClientIds.add(cid);
          const tl = Number(o.toplevel_id ?? o.toplevelid);
          if (Number.isFinite(tl) && tl > 0) contractClientIds.add(tl);
        }
      }

      // Tickets last 90d for client coverage (reuse tickets fetch lighter)
      const tRes = await fetchAllPages(base, token, "/api/Tickets", {
        pageSize: 100,
        maxPages: 300,
        extraParams: {
          dateFrom: start90.toISOString().slice(0, 10),
          dateopen: start90.toISOString().slice(0, 10),
          dateTo: now.toISOString().slice(0, 10),
          fields: "id,client_id,clientid,dateoccurred",
        },
        listKeys: ["tickets"],
      });
      const ticketClients90 = new Set();
      if (!tRes.error) {
        for (const row of tRes.rows) {
          const created = firstUsableDate(row, [
            "dateoccurred",
            "createddate",
            "datecreated",
          ]);
          if (created && created.date < start90) continue;
          const cid = clientIdOf(row);
          if (cid) ticketClients90.add(cid);
        }
      }

      // Sites (child locations) — separate Halo endpoint
      let siteCount = null;
      let siteStatus = null;
      {
        const sRes = await haloGet(base, token, "/api/Site", {
          pageinate: "true",
          page_size: "1",
          page_no: "1",
        });
        siteStatus = sRes.status;
        if (sRes.ok && sRes.json && typeof sRes.json === "object") {
          const rc =
            sRes.json.record_count ??
            sRes.json.recordCount ??
            sRes.json.total ??
            null;
          siteCount = typeof rc === "number" ? rc : null;
        }
      }

      // Map any client id → its top-level account id (self if already top)
      const toTopLevel = new Map();
      for (const row of r.rows) {
        const o = asObj(row);
        const id = Number(o.id);
        if (!Number.isFinite(id)) continue;
        const tlRaw = o.toplevel_id ?? o.toplevelid ?? o.top_level_id;
        const tlNum = tlRaw == null || tlRaw === "" ? null : Number(tlRaw);
        if (topLevelIds.has(id)) {
          toTopLevel.set(id, id);
        } else if (tlNum != null && Number.isFinite(tlNum) && tlNum > 0) {
          toTopLevel.set(id, tlNum);
        } else if (o.is_account === true) {
          toTopLevel.set(id, id);
        }
      }

      let topWithContractAndTicket = 0;
      const contractTops = new Set();
      const ticketTops = new Set();
      for (const id of contractClientIds) {
        const top = toTopLevel.get(id) ?? (topLevelIds.has(id) ? id : null);
        if (top != null) contractTops.add(top);
      }
      for (const id of ticketClients90) {
        const top = toTopLevel.get(id) ?? (topLevelIds.has(id) ? id : null);
        if (top != null) ticketTops.add(top);
      }
      for (const id of topLevelIds) {
        if (contractTops.has(id) && ticketTops.has(id)) {
          topWithContractAndTicket += 1;
        }
      }

      // Also count direct overlap when hierarchy map is incomplete
      let directOverlap = 0;
      for (const id of contractClientIds) {
        if (ticketClients90.has(id)) directOverlap += 1;
      }

      printTable("8. Clients", [
        { metric: "endpoint_used", value: clientsEndpoint },
        { metric: "clients_total", value: r.rows.length },
        { metric: "top_level_count", value: topLevel },
        { metric: "child_or_site_count", value: child },
        { metric: "unclassified_count", value: unknown },
        { metric: "is_account_true", value: isAccountTrue },
        { metric: "is_account_false", value: isAccountFalse },
        { metric: "is_account_missing", value: isAccountMissing },
        { metric: "sites_api_status", value: siteStatus ?? "" },
        { metric: "sites_record_count", value: siteCount ?? "" },
        {
          metric: "toplevel_with_active_contract_and_ticket_90d",
          value: topWithContractAndTicket,
        },
        {
          metric: "client_ids_with_active_contract_AND_ticket_90d_direct",
          value: directOverlap,
        },
        {
          metric: "active_contract_client_ids_seen",
          value: contractClientIds.size,
        },
        {
          metric: "clients_with_ticket_last_90d",
          value: ticketClients90.size,
        },
        {
          metric: "contract_fetch_ok",
          value: cRes.error ? `no (${cRes.status})` : "yes",
        },
        {
          metric: "tickets_90d_fetch_ok",
          value: tRes.error ? `no (${tRes.status})` : "yes",
        },
        { metric: "header_keys_sample", value: (r.firstKeys || []).slice(0, 50).join(", ") },
      ]);
    }
  }

  console.log("\nDone. No data written.");
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
