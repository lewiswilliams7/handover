import { normalizeConnectWiseSiteUrl } from "@/lib/psa/connectwise";

type CwAuthHeaders = {
  Authorization: string;
  clientId: string;
  "Content-Type": string;
};

function parseCwListPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

function podLooksServiceTicket(pod: unknown): boolean {
  const s = String(pod ?? "").trim().toLowerCase();
  if (!s) return false;
  if (s === "sr") return true;
  if (s.includes("service") && s.includes("ticket")) return true;
  if (s.includes("serviceticket")) return true;
  if (s.includes("sr_")) return true;
  if (s.endsWith("sr")) return true;
  return false;
}

export type CwCustomFieldListItem = { name: string; label: string; id: number };

/**
 * Loads ConnectWise Manage user-defined field definitions for service tickets.
 * Tries common `pod` filters, then an unfiltered list filtered client-side.
 */
export async function fetchCwServiceTicketUserDefinedFields(params: {
  siteUrl: string;
  headers: CwAuthHeaders;
}): Promise<{ fields: CwCustomFieldListItem[]; lastError?: string }> {
  const base = normalizeConnectWiseSiteUrl(params.siteUrl);
  const apiRoot = `${base}/v4_6_release/apis/3.0`;
  const attempts: Array<{ url: string; mode: "strict" | "filter" }> = [
    {
      url: `${apiRoot}/system/userDefinedFields?pageSize=1000&conditions=${encodeURIComponent(`pod='sr'`)}`,
      mode: "strict",
    },
    {
      url: `${apiRoot}/system/userDefinedFields?pageSize=1000&conditions=${encodeURIComponent(`pod='ServiceTicket'`)}`,
      mode: "strict",
    },
    {
      url: `${apiRoot}/system/userDefinedFields?pageSize=1000`,
      mode: "filter",
    },
  ];

  let lastError = "";

  for (const { url, mode } of attempts) {
    try {
      const res = await fetch(url, { headers: params.headers, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${text.slice(0, 240)}`;
        continue;
      }
      const rawRows = parseCwListPayload(JSON.parse(text) as unknown) as Array<{
        id?: number;
        caption?: string | null;
        pod?: string | null;
      }>;

      let rows = rawRows;
      if (mode === "filter") {
        rows = rawRows.filter(
          (r) =>
            typeof r.id === "number" &&
            Number.isFinite(r.id) &&
            String(r.caption ?? "").trim().length > 0 &&
            podLooksServiceTicket(r.pod),
        );
      }

      const toFieldItems = (list: typeof rawRows): CwCustomFieldListItem[] =>
        list
          .filter((r) => typeof r.id === "number" && String(r.caption ?? "").trim().length > 0)
          .map((r) => {
            const cap = String(r.caption).trim();
            return {
              id: r.id as number,
              name: cap,
              label: `${cap} (id ${r.id})`,
            };
          });

      let fields = toFieldItems(rows);

      if (fields.length === 0 && mode === "filter" && rawRows.length > 0) {
        const loose = toFieldItems(rawRows).slice(0, 120);
        if (loose.length > 0) {
          fields = loose;
        }
      }

      if (fields.length > 0) {
        return { fields };
      }
      lastError = "Request succeeded but no ticket user-defined fields were returned.";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return { fields: [], lastError };
}

export function findCwUserDefinedFieldMatch(
  fields: CwCustomFieldListItem[],
  raw: string,
): CwCustomFieldListItem | undefined {
  const q = raw.trim();
  if (!q) return undefined;
  const lower = q.toLowerCase();
  const asNum = Number.parseInt(q, 10);
  return fields.find(
    (f) =>
      f.name === q ||
      f.name.toLowerCase() === lower ||
      String(f.id) === q ||
      (Number.isFinite(asNum) && f.id === asNum),
  );
}
