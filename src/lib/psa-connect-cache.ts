/** Shared GET /api/halo/connect + /api/cw/connect cache (3 min TTL). */

export const PSA_CONNECT_CACHE_TTL_MS = 3 * 60 * 1000;

export type HaloConnectJson = {
  connected?: boolean;
  haloUrl?: string;
  updatedAt?: string | null;
  proRequired?: boolean;
  autoClosureSummaryEnabled?: boolean;
  reconnectRecommended?: boolean;
  connectionCheckFailed?: boolean;
  error?: string;
};

export type CwConnectJson = {
  connected?: boolean;
  siteUrl?: string;
};

export type PsaConnectBundle = {
  halo: { ok: boolean; json: HaloConnectJson };
  cw: { ok: boolean; json: CwConnectJson };
  halopsa: boolean;
  connectwise: boolean;
  cachedAt: number;
};

let cache: PsaConnectBundle | null = null;
let inflight: Promise<PsaConnectBundle> | null = null;

function isCacheValid(entry: PsaConnectBundle | null): entry is PsaConnectBundle {
  if (!entry) return false;
  return Date.now() - entry.cachedAt < PSA_CONNECT_CACHE_TTL_MS;
}

export function invalidatePsaConnectCache(): void {
  cache = null;
  inflight = null;
}

async function fetchPsaConnectBundle(): Promise<PsaConnectBundle> {
  const [haloRes, cwRes] = await Promise.all([
    fetch("/api/halo/connect", { method: "GET", credentials: "same-origin" }),
    fetch("/api/cw/connect", { method: "GET", credentials: "same-origin" }),
  ]);
  const haloJson = (await haloRes.json().catch(() => ({}))) as HaloConnectJson;
  const cwJson = (await cwRes.json().catch(() => ({}))) as CwConnectJson;
  const entry: PsaConnectBundle = {
    halo: { ok: haloRes.ok, json: haloJson },
    cw: { ok: cwRes.ok, json: cwJson },
    halopsa: haloJson.connected === true,
    connectwise: cwJson.connected === true,
    cachedAt: Date.now(),
  };
  cache = entry;
  return entry;
}

/** Single inflight pair fetch; subsequent callers within TTL read from cache. */
export async function getPsaConnectBundle(): Promise<PsaConnectBundle> {
  if (isCacheValid(cache)) {
    const ageMs = Date.now() - cache.cachedAt;
    console.log("[psa-cache] serving from cache, age:", ageMs);
    return cache;
  }
  if (!inflight) {
    inflight = fetchPsaConnectBundle().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
