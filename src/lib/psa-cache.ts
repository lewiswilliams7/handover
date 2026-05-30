import useSWR, { mutate as globalMutate } from "swr";

const CACHE_TTL = 5 * 60 * 1000;

type Fetcher<T> = () => Promise<T>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Failed request: ${url}`);
  }
  return data;
}

function usePsaSWR<T>(key: readonly unknown[] | null, fetcher: Fetcher<T>) {
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: CACHE_TTL,
    keepPreviousData: true,
  });
}

export function useHaloTickets(enabled = true) {
  return usePsaSWR(
    enabled ? ["psa", "halo", "tickets"] as const : null,
    () => fetchJson<{ tickets: unknown[] }>("/api/halo/tickets", { method: "POST", body: JSON.stringify({ type: "tickets", count: 1000, includeDetails: false }) }),
  );
}

export function useHaloProjects(enabled = true) {
  return usePsaSWR(
    enabled ? ["psa", "halo", "projects"] as const : null,
    () => fetchJson<{ projects: unknown[] }>("/api/halo/projects"),
  );
}

export function useCwTickets(enabled = true) {
  return usePsaSWR(
    enabled ? ["psa", "cw", "tickets"] as const : null,
    () => fetchJson<{ tickets: unknown[] }>("/api/cw/tickets"),
  );
}

export function useCwProjects(enabled = true) {
  return usePsaSWR(
    enabled ? ["psa", "cw", "projects"] as const : null,
    () => fetchJson<{ projects: unknown[] }>("/api/cw/projects"),
  );
}

export async function invalidatePsaCache() {
  await globalMutate(
    (key) => Array.isArray(key) && key[0] === "psa",
    undefined,
    { revalidate: true },
  );
}

