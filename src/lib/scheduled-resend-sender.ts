import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProfileNameFields } from "@/lib/resend-from-header";

export { getNoreplyMailbox } from "@/lib/resend-from-header";

export async function fetchScheduledEmailSenderContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  replyTo: string | null;
  companyName: string | null;
  profileForResendFrom: ProfileNameFields;
}> {
  let replyTo: string | null = null;
  let companyName: string | null = null;
  let profileForResendFrom: ProfileNameFields = null;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (!error && data.user?.email?.trim()) {
      replyTo = data.user.email.trim();
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select(
        "company_name, display_name, first_name, last_name, brand_name, brand_colour, brand_secondary_colour, brand_logo_url, plan, white_label_mode",
      )
      .eq("id", userId)
      .maybeSingle();
    profileForResendFrom = prof;
    const cn = prof?.company_name;
    if (typeof cn === "string" && cn.trim()) companyName = cn.trim();
  } catch {
    /* ignore */
  }

  return { replyTo, companyName, profileForResendFrom };
}
