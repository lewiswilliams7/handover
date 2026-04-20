import type { SupabaseClient } from "@supabase/supabase-js";

import { mergeEmailsSentAppend } from "@/lib/emails-sent";

/**
 * Appends an email ID to `profiles.emails_sent` if not already present.
 * @returns true if the ID was already present or append succeeded.
 */
export async function appendProfileEmailSentIfAbsent(
  admin: SupabaseClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select("emails_sent")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profile-emails-sent] select:", error);
    return false;
  }

  const { next, changed } = mergeEmailsSentAppend(data?.emails_sent, id);
  if (!changed) return true;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ emails_sent: next })
    .eq("id", userId);

  if (upErr) {
    console.error("[profile-emails-sent] update:", upErr);
    return false;
  }
  return true;
}
