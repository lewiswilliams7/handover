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

export async function fetchDeliveryHealth(url: string): Promise<DeliveryHealthApiResponse> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const json = (await res.json()) as DeliveryHealthApiResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Could not load dashboard.");
  return json;
}
