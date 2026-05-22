"use client";

import { useEffect, useMemo, useState } from "react";

import { getPsaConnectBundle, invalidatePsaConnectCache } from "@/lib/psa-connect-cache";

type StatusShape = { halo: boolean; connectwise: boolean; loading: boolean };

export function invalidatePSAStatusCache(): void {
  invalidatePsaConnectCache();
}

async function fetchPsaStatus(): Promise<{ halo: boolean; connectwise: boolean }> {
  try {
    const bundle = await getPsaConnectBundle();
    return {
      halo: bundle.halopsa,
      connectwise: bundle.connectwise,
    };
  } catch (error) {
    console.log("[integrations] load error:", error);
    return { halo: false, connectwise: false };
  }
}

export function usePSAStatus(): StatusShape {
  const [status, setStatus] = useState<{ halo: boolean; connectwise: boolean }>({
    halo: false,
    connectwise: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPsaStatus()
      .then((res) => {
        if (!cancelled) setStatus(res);
      })
      .catch((error) => {
        console.log("[integrations] load error:", error);
        if (!cancelled) setStatus({ halo: false, connectwise: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ halo: status.halo, connectwise: status.connectwise, loading }),
    [status.connectwise, status.halo, loading],
  );
}
