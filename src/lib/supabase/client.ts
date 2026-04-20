import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | null = null;

/** Browser / client components only. */
export function createClient() {
  if (browserClient) return browserClient;
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
  let getUserInFlight: Promise<
    Awaited<ReturnType<typeof originalGetUser>>
  > | null = null;

  supabase.auth.getUser = async (...args) => {
    const execute = async () => {
      try {
        const res = await originalGetUser(...args);
        if (res.error?.message?.includes("Refresh Token Not Found")) {
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.location.href = "/auth?tab=signin";
          }
        }
        return res;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Refresh Token Not Found")
        ) {
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.location.href = "/auth?tab=signin";
          }
        }
        throw error;
      }
    };

    if (getUserInFlight) return getUserInFlight;
    getUserInFlight = execute().finally(() => {
      getUserInFlight = null;
    });
    return getUserInFlight;
  };

  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async (...args) => {
    try {
      const res = await originalGetSession(...args);
      if (res.error?.message?.includes("Refresh Token Not Found")) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          window.location.href = "/auth?tab=signin";
        }
      }
      return res;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Refresh Token Not Found")
      ) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          window.location.href = "/auth?tab=signin";
        }
      }
      throw error;
    }
  };

  /** Intentionally no `onAuthStateChange` redirect: `TOKEN_REFRESHED` can race without a session;
   * invalid refresh tokens are handled in getUser/getSession above. */

  browserClient = supabase;
  return supabase;
}
