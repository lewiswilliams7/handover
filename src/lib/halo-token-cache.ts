/**
 * In-memory OAuth token cache (per server instance) to avoid hitting
 * `/auth/token` on every paginated clients request or API call.
 */

type CacheEntry = { token: string; expiresAt: number };

const tokenCache: Record<string, CacheEntry> = {};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function makeCacheKey(haloUrl: string, tenant: string | null | undefined, clientId: string): string {
  return `${normalizeBaseUrl(haloUrl)}|${tenant?.trim() ?? ""}|${clientId}`;
}

export type CachedTokenParams = {
  haloUrl: string;
  tenant: string | null | undefined;
  clientId: string;
  clientSecret: string;
};

/**
 * Returns a valid access token, using cache when still within ~90% of `expires_in`.
 */
export async function getCachedHaloAccessToken(params: CachedTokenParams): Promise<string | null> {
  const base = normalizeBaseUrl(params.haloUrl);
  const cacheKey = makeCacheKey(base, params.tenant, params.clientId);
  const now = Date.now();

  const hit = tokenCache[cacheKey];
  if (hit && hit.expiresAt > now) {
    console.log("[halo-token] Using cached token");
    return hit.token;
  }

  const tokenUrl = new URL(`${base}/auth/token`);
  if (params.tenant?.trim()) {
    tokenUrl.searchParams.set("tenant", params.tenant.trim());
  }

  const res = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      scope: "all",
    }).toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const token = data.access_token;
  if (!token) {
    return null;
  }

  const expiresInSec =
    typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
      ? data.expires_in
      : 3600;
  // 90% of lifetime in milliseconds
  const ttlMs = Math.max(30_000, Math.floor(expiresInSec * 1000 * 0.9));
  tokenCache[cacheKey] = {
    token,
    expiresAt: now + ttlMs,
  };

  return token;
}

/** Clears cached OAuth token so the next `getCachedHaloAccessToken` forces a fresh `/auth/token` call. */
export function invalidateHaloTokenCache(params: CachedTokenParams): void {
  const cacheKey = makeCacheKey(
    normalizeBaseUrl(params.haloUrl),
    params.tenant,
    params.clientId,
  );
  delete tokenCache[cacheKey];
}
