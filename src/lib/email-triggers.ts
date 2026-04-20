import { sendUpgradeNudgeEmail, sendWelcomeEmail } from "@/lib/emails";
import { EmailId, profileHasEmailSent } from "@/lib/emails-sent";
import { isProOrTeam } from "@/lib/plans";
import { appendProfileEmailSentIfAbsent } from "@/lib/profile-emails-sent";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function firstNameFromProfile(profile: {
  first_name?: string | null;
  display_name?: string | null;
}): string {
  const fn = typeof profile.first_name === "string" ? profile.first_name.trim() : "";
  if (fn) return fn;
  const dn = typeof profile.display_name === "string" ? profile.display_name.trim() : "";
  if (dn) {
    const first = dn.split(/\s+/)[0];
    if (first) return first;
  }
  return "there";
}

function startOfMonthUtcIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

/**
 * Sends founder welcome email once per user (public.welcome_emails_sent).
 * Invoked after email confirmation from the auth callback (and /api/emails/welcome).
 */
export async function runWelcomeEmailForUser(userId: string): Promise<void> {
  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    console.warn("[email-triggers] welcome: service role client unavailable");
    return;
  }

  const { data: alreadySent, error: sentErr } = await admin
    .from("welcome_emails_sent")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (sentErr) {
    console.error("[email-triggers] welcome welcome_emails_sent:", sentErr);
    return;
  }
  if (alreadySent?.user_id) {
    console.log("[email-triggers] welcome: already recorded in welcome_emails_sent, skip");
    return;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("first_name, display_name, emails_sent")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[email-triggers] welcome profile:", profileErr);
    return;
  }
  if (!profile) {
    return;
  }
  if (profileHasEmailSent(profile.emails_sent, EmailId.FREE_DRIP_WELCOME)) {
    console.log("[email-triggers] welcome: FREE_DRIP_WELCOME already in emails_sent, skip");
    return;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData.user?.email) {
    console.error("[email-triggers] welcome auth user:", authErr);
    return;
  }

  const firstName = firstNameFromProfile(profile);

  try {
    await sendWelcomeEmail(authData.user.email, firstName);
  } catch (e) {
    console.error("[email-triggers] sendWelcomeEmail failed:", e);
    return;
  }

  await appendProfileEmailSentIfAbsent(admin, userId, EmailId.FREE_DRIP_WELCOME);

  const { error: logErr } = await admin.from("welcome_emails_sent").insert({ user_id: userId });
  if (logErr) {
    console.error("[email-triggers] welcome_emails_sent insert:", logErr);
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", userId);

  if (updateErr) {
    console.error("[email-triggers] welcome_email_sent update:", updateErr);
  }
}

/**
 * Sends upgrade nudge when Basic-plan user is near their monthly generation limit and nudge not yet sent.
 */
export async function runUpgradeNudgeForUser(userId: string): Promise<void> {
  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    console.warn("[email-triggers] nudge: service role client unavailable");
    return;
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select(
      "nudge_email_sent, first_name, display_name, last_name, company_name, brand_name, plan, team_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[email-triggers] nudge profile:", profileErr);
    return;
  }
  if (!profile || profile.nudge_email_sent === true) {
    return;
  }
  if (typeof profile.plan === "string" && isProOrTeam(profile.plan)) {
    return;
  }
  if (profile.team_id) {
    return;
  }

  const start = startOfMonthUtcIso();
  const { count, error: countErr } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start);

  if (countErr) {
    console.error("[email-triggers] nudge count:", countErr);
    return;
  }

  const c = count ?? 0;
  if (c < 8 || c > 10) {
    return;
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !authData.user?.email) {
    console.error("[email-triggers] nudge auth user:", authErr);
    return;
  }

  const firstName =
    typeof profile.first_name === "string" && profile.first_name.trim()
      ? profile.first_name.trim()
      : "there";

  const from = buildHandoverResendFromHeader(profile);

  try {
    await sendUpgradeNudgeEmail(authData.user.email, firstName, c, { from });
  } catch (e) {
    console.error("[email-triggers] sendUpgradeNudgeEmail failed:", e);
    return;
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ nudge_email_sent: true })
    .eq("id", userId);

  if (updateErr) {
    console.error("[email-triggers] nudge_email_sent update:", updateErr);
  }
}
