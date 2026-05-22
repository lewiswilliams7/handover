import { useEffect, useMemo, useState } from "react";

import {
  getPsaConnectBundle,
  invalidatePsaConnectCache,
  PSA_CONNECT_CACHE_TTL_MS,
} from "@/lib/psa-connect-cache";

type PsaKey = "halopsa" | "connectwise";

type PsaConnections = {
  halopsa: boolean;
  connectwise: boolean;
  primary: PsaKey | null;
  multiple: boolean;
};

/** Call after Halo/CW connect or disconnect so consumers without overrides see fresh flags. */
export function invalidatePsaConnectionsCache(): void {
  invalidatePsaConnectCache();
}

export { PSA_CONNECT_CACHE_TTL_MS };

async function fetchPsaConnections(): Promise<{ halopsa: boolean; connectwise: boolean }> {
  const bundle = await getPsaConnectBundle();
  return { halopsa: bundle.halopsa, connectwise: bundle.connectwise };
}

export function usePSAConnections(input?: {
  halopsa?: boolean;
  connectwise?: boolean;
}): PsaConnections {
  const hasOverride =
    typeof input?.halopsa === "boolean" || typeof input?.connectwise === "boolean";
  const [fetched, setFetched] = useState<{ halopsa: boolean; connectwise: boolean }>({
    halopsa: false,
    connectwise: false,
  });

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
