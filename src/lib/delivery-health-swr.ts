import type { DeliveryHealthApiResponse } from "@/lib/delivery-health";

export const DELIVERY_HEALTH_SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 3 * 60 * 1000,
  keepPreviousData: true,
} as const;

export function buildDeliveryHealthSwrKey(
  demoMode: boolean,
  connectwiseConnected: boolean,
  primary: "halopsa" | "connectwise" | null,
): string | null {
  if (demoMode) return null;
  const params = new URLSearchParams();
  if (connectwiseConnected && primary === "connectwise") {
    params.set("source", "connectwise");
  }
  return `/api/delivery-health${params.toString() ? `?${params.toString()}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function fetchDeliveryHealth(url: string): Promise<DeliveryHealthApiResponse> {
  const retryDelays = [0, 3000, 8000];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    const delay = retryDelays[attempt] ?? 0;
    if (delay > 0) await sleep(delay);

    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const json = (await res.json()) as DeliveryHealthApiResponse & { error?: string };
      if (res.ok) return json;

      console.error("[delivery-health] fetch error:", json?.error, "status:", res.status);
      lastError = new Error(json.error ?? "Could not load dashboard.");
      if (res.status !== 429 && res.status < 500) break;
    } catch (error) {
      console.error("[delivery-health] fetch error:", error, "status:", undefined);
      lastError = error instanceof Error ? error : new Error("Could not load dashboard.");
    }
  }

  throw lastError ?? new Error("Could not load dashboard.");
}
