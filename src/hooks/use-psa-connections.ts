import { useEffect, useMemo, useState } from "react";

type PsaKey = "halopsa" | "connectwise";

type PsaConnections = {
  halopsa: boolean;
  connectwise: boolean;
  primary: PsaKey | null;
  multiple: boolean;
};

let cachedConnections: { halopsa: boolean; connectwise: boolean } | null = null;
let inflight: Promise<{ halopsa: boolean; connectwise: boolean }> | null = null;

/** Call after Halo/CW connect or disconnect so consumers without overrides see fresh flags. */
export function invalidatePsaConnectionsCache(): void {
  cachedConnections = null;
}

async function fetchPsaConnections(): Promise<{ halopsa: boolean; connectwise: boolean }> {
  if (cachedConnections) return cachedConnections;
  if (!inflight) {
    inflight = (async () => {
      const [haloRes, cwRes] = await Promise.all([
        fetch("/api/halo/connect", { method: "GET", credentials: "same-origin" }),
        fetch("/api/cw/connect", { method: "GET", credentials: "same-origin" }),
      ]);
      const haloJson = (await haloRes.json().catch(() => ({}))) as { connected?: boolean };
      const cwJson = (await cwRes.json().catch(() => ({}))) as { connected?: boolean };
      cachedConnections = {
        halopsa: haloJson.connected === true,
        connectwise: cwJson.connected === true,
      };
      return cachedConnections;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function usePSAConnections(input?: {
  halopsa?: boolean;
  connectwise?: boolean;
}): PsaConnections {
  const hasOverride =
    typeof input?.halopsa === "boolean" || typeof input?.connectwise === "boolean";
  const [fetched, setFetched] = useState<{ halopsa: boolean; connectwise: boolean }>(
    cachedConnections ?? { halopsa: false, connectwise: false },
  );

  useEffect(() => {
    if (hasOverride) return;
    let cancelled = false;
    void fetchPsaConnections().then((res) => {
      if (!cancelled) setFetched(res);
    });
    return () => {
      cancelled = true;
    };
  }, [hasOverride]);

  return useMemo(() => {
    const halopsa = input?.halopsa ?? fetched.halopsa;
    const connectwise = input?.connectwise ?? fetched.connectwise;
    const multiple = halopsa && connectwise;
    const primary: PsaKey | null = halopsa ? "halopsa" : connectwise ? "connectwise" : null;
    return { halopsa, connectwise, primary, multiple };
  }, [fetched.connectwise, fetched.halopsa, input?.connectwise, input?.halopsa]);
}

