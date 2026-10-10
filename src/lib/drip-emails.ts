import {
  sendColdTrialInternalAlert,
  sendFreeDripFounderNoteEmail,
  sendFreeDripPsaNudgeEmail,
  sendFreeDripSaveTimeEmail,
  sendLoopCloserEmail,
} from "@/lib/emails";
import { EmailId, profileHasEmailSent } from "@/lib/emails-sent";
import { wholeUtcDaysSince } from "@/lib/email-cron-dates";
import { appendProfileEmailSentIfAbsent } from "@/lib/profile-emails-sent";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { runTrialSequenceEmailCron } from "@/lib/trial-sequence-cron";
import {
  isSoloSubscriptionLive,
  normalizePlanLabel,
  planFieldsFromProfileRow,
} from "@/lib/utils/getPlan";

const MS_48H = 48 * 60 * 60 * 1000;
const MS_4D = 4 * 24 * 60 * 60 * 1000;

function firstNameFromProfileParts(firstName: string | null, displayName: string | null): string {
  const fn = typeof firstName === "string" ? firstName.trim() : "";
  if (fn) return fn;
  const dn = typeof displayName === "string" ? displayName.trim() : "";
  if (dn) return dn.split(/\s+/)[0] ?? "there";
  return "there";
}

/**
 * 48h loop-closer (any solo user) + 4d cold trial outreach + internal founder alert.
 * Deduped via `profiles.emails_sent`.
 */
export async function runPostGenerationRetentionEmailCron(): Promise<{
  loopCloser48h: { attempted: number; sent: number };
  coldTrial: { attempted: number; sent: number; internalAlerts: number };
  errors: string[];
}> {
  const errors: string[] = [];
  const loopCloser48h = { attempted: 0, sent: 0 };
  const coldTrial = { attempted: 0, sent: 0, internalAlerts: 0 };

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    errors.push(`service_role: ${e instanceof Error ? e.message : String(e)}`);
    return { loopCloser48h, coldTrial, errors };
  }

  const now = new Date();
  const iso48hAgo = new Date(now.getTime() - MS_48H).toISOString();
  const iso4dAgo = new Date(now.getTime() - MS_4D).toISOString();

  const page = 300;
  let offset = 0;
  for (;;) {
    const { data: batch, error: qErr } = await admin
      .from("profiles")
      .select(
        "id, email, first_name, display_name, plan, team_id, emails_sent, last_generation_at, has_completed_loop, total_generations, trial_ends_at, subscription_status",
      )
      .eq("has_completed_loop", false)
      .not("last_generation_at", "is", null)
      .lt("last_generation_at", iso48hAgo)
      .is("team_id", null)
      .range(offset, offset + page - 1);

    if (qErr) {
      errors.push(`postGenRetention select: ${qErr.message}`);
      break;
    }
    const rows = batch ?? [];
    if (rows.length === 0) break;

    for (const raw of rows) {
      const row = raw as {
        id: string;
        email: string | null;
        first_name: string | null;
        display_name: string | null;
        plan: string | null;
        emails_sent: unknown;
        last_generation_at: string | null;
        has_completed_loop?: boolean | null;
        total_generations: number | null;
        trial_ends_at: string | null;
        subscription_status: string | null;
        team_id?: string | null;
      };

      if (row.has_completed_loop === true) continue;

      const lastGen = row.last_generation_at?.trim();
      if (!lastGen) continue;

      let emailTo = typeof row.email === "string" ? row.email.trim() : "";
      if (!emailTo) {
        const { data: u } = await admin.auth.admin.getUserById(row.id);
        emailTo = u.user?.email?.trim() ?? "";
      }
      if (!emailTo) continue;

      const firstName = firstNameFromProfileParts(row.first_name, row.display_name);
      const emailsSent = row.emails_sent;
      const plan = normalizePlanLabel(row.plan ?? "");
      const isTrialPlan = plan === "professional_trial" || plan === "team_trial";
      const totalGens =
        typeof row.total_generations === "number" && Number.isFinite(row.total_generations)
          ? Math.max(0, Math.floor(row.total_generations))
          : 0;

      const lastGenMs = Date.parse(lastGen);
      if (!Number.isFinite(lastGenMs)) continue;

      const coldTrialEligible =
        isTrialPlan &&
        totalGens >= 1 &&
        lastGenMs < now.getTime() - MS_4D &&
        !profileHasEmailSent(emailsSent, EmailId.COLD_USER_FOUNDER_OUTREACH);

      if (coldTrialEligible) {
        coldTrial.attempted += 1;
        try {
          if (!profileHasEmailSent(emailsSent, EmailId.LOOP_CLOSER_48H)) {
            await sendLoopCloserEmail({ to: emailTo, firstName });
            coldTrial.sent += 1;
          }
          await appendProfileEmailSentIfAbsent(admin, row.id, EmailId.COLD_USER_FOUNDER_OUTREACH);
          await sendColdTrialInternalAlert({
            userEmail: emailTo,
            totalGenerations: totalGens,
            lastGenerationAtIso: lastGen,
          });
          coldTrial.internalAlerts += 1;
        } catch (e) {
          errors.push(`coldTrial ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
        continue;
      }

      if (
        !profileHasEmailSent(emailsSent, EmailId.LOOP_CLOSER_48H) &&
        !profileHasEmailSent(emailsSent, EmailId.COLD_USER_FOUNDER_OUTREACH)
      ) {
        loopCloser48h.attempted += 1;
        try {
          await sendLoopCloserEmail({ to: emailTo, firstName });
          await appendProfileEmailSentIfAbsent(admin, row.id, EmailId.LOOP_CLOSER_48H);
          loopCloser48h.sent += 1;
        } catch (e) {
          errors.push(`loopCloser48h ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    if (rows.length < page) break;
    offset += page;
  }

  return { loopCloser48h, coldTrial, errors };
}

function hasNeverStartedHandoverTrial(plan: string | null, trialPlan: string | null): boolean {
  const p = normalizePlanLabel(plan ?? "");
  if (p === "professional_trial" || p === "team_trial") return false;
  if (p === "free" && trialPlan?.trim()) return false;
  return true;
}

function isPaidSoloSubscriptionRow(row: {
  plan?: string | null;
  subscription_status?: string | null;
  team_id?: string | null;
}): boolean {
  if (typeof row.team_id === "string" && row.team_id.trim()) return false;
  const f = planFieldsFromProfileRow(row);
  const p = normalizePlanLabel(f.plan ?? "");
  const canon = p === "pro" ? "professional" : p;
  if (canon === "professional_trial" || canon === "team_trial") return false;
  if (canon === "enterprise" || canon === "team" || canon === "professional") {
    return isSoloSubscriptionLive(f.subscription_status);
  }
  return false;
}

function isFreeOrBasicPlan(plan: string | null | undefined): boolean {
  const p = normalizePlanLabel(plan ?? "");
  return p === "free" || p === "basic" || p === "";
}

async function userHasPsaConnected(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<boolean> {
  const { data: h } = await admin
    .from("halo_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (h?.user_id) return true;
  const { data: c } = await admin
    .from("cw_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(c?.user_id);
}

/**
 * Free/basic drip (days 2, 5, 10) + full trial lifecycle sequence (daily).
 * Uses `profiles.emails_sent` for deduplication.
 */
export async function runDripEmailCron(): Promise<{
  freeDrip: {
    psaAttempted: number;
    psaSent: number;
    saveTimeAttempted: number;
    saveTimeSent: number;
    founderAttempted: number;
    founderSent: number;
  };
  trial: Awaited<ReturnType<typeof runTrialSequenceEmailCron>>;
  postGenRetention: {
    loopCloser48h: { attempted: number; sent: number };
    coldTrial: { attempted: number; sent: number; internalAlerts: number };
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const freeStats = {
    psaAttempted: 0,
    psaSent: 0,
    saveTimeAttempted: 0,
    saveTimeSent: 0,
    founderAttempted: 0,
    founderSent: 0,
  };

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    errors.push(`service_role: ${e instanceof Error ? e.message : String(e)}`);
    return {
      freeDrip: freeStats,
      trial: { attempted: 0, sent: {}, errors: [] },
      postGenRetention: {
        loopCloser48h: { attempted: 0, sent: 0 },
        coldTrial: { attempted: 0, sent: 0, internalAlerts: 0 },
      },
      errors,
    };
  }

  const now = new Date();
  let page = 1;
  const perPage = 500;

  for (;;) {
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listErr) {
      errors.push(`listUsers: ${listErr.message}`);
      break;
    }
    const users = listData?.users ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      const userId = u.id;
      const email = u.email?.trim();
      if (!email) continue;

      const createdAt = u.created_at;
      const days = wholeUtcDaysSince(createdAt, now);
      if (days < 0) continue;

      const { data: profile, error: profErr } = await admin
        .from("profiles")
        .select(
          "plan, total_generations, team_id, first_name, display_name, created_at, trial_plan, emails_sent, subscription_status",
        )
        .eq("id", userId)
        .maybeSingle();

      if (profErr) {
        errors.push(`profile ${userId}: ${profErr.message}`);
        continue;
      }
      if (!profile) continue;
      if (profile.team_id) continue;
      if (!isFreeOrBasicPlan(profile.plan as string)) continue;
      if (isPaidSoloSubscriptionRow(profile)) continue;

      const createdForDays =
        typeof profile.created_at === "string" && profile.created_at.trim()
          ? profile.created_at.trim()
          : createdAt;
      const d = wholeUtcDaysSince(createdForDays, now);

      const firstName =
        (typeof profile.first_name === "string" && profile.first_name.trim()
          ? profile.first_name.trim()
          : typeof profile.display_name === "string" && profile.display_name.trim()
            ? profile.display_name.trim().split(/\s+/)[0]
            : "") || "there";

      const trialPlan = typeof profile.trial_plan === "string" ? profile.trial_plan : null;
      const neverTrial = hasNeverStartedHandoverTrial(
        typeof profile.plan === "string" ? profile.plan : null,
        trialPlan,
      );

      const totalGenerations =
        typeof profile.total_generations === "number" && Number.isFinite(profile.total_generations)
          ? Math.max(0, Math.floor(profile.total_generations))
          : 0;

      const emailsSent = profile.emails_sent;

      if (d === 2 && neverTrial) {
        freeStats.psaAttempted += 1;
        if (profileHasEmailSent(emailsSent, EmailId.FREE_DRIP_PSA_NUDGE)) continue;
        const hasPsa = await userHasPsaConnected(admin, userId);
        if (hasPsa) continue;
        try {
          await sendFreeDripPsaNudgeEmail(email, firstName);
          await appendProfileEmailSentIfAbsent(admin, userId, EmailId.FREE_DRIP_PSA_NUDGE);
          freeStats.psaSent += 1;
        } catch (e) {
          errors.push(`psa ${userId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (d === 5 && neverTrial) {
        freeStats.saveTimeAttempted += 1;
        if (profileHasEmailSent(emailsSent, EmailId.FREE_DRIP_SAVE_TIME)) continue;
        if (totalGenerations !== 0) continue;
        try {
          await sendFreeDripSaveTimeEmail(email, firstName);
          await appendProfileEmailSentIfAbsent(admin, userId, EmailId.FREE_DRIP_SAVE_TIME);
          freeStats.saveTimeSent += 1;
        } catch (e) {
          errors.push(`saveTime ${userId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (d === 10 && neverTrial) {
        freeStats.founderAttempted += 1;
        if (profileHasEmailSent(emailsSent, EmailId.FREE_DRIP_FOUNDER_NOTE)) continue;
        try {
          await sendFreeDripFounderNoteEmail(email, firstName);
          await appendProfileEmailSentIfAbsent(admin, userId, EmailId.FREE_DRIP_FOUNDER_NOTE);
          freeStats.founderSent += 1;
        } catch (e) {
          errors.push(`founder ${userId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  let trial: Awaited<ReturnType<typeof runTrialSequenceEmailCron>>;
  try {
    trial = await runTrialSequenceEmailCron();
  } catch (e) {
    trial = { attempted: 0, sent: {}, errors: [String(e)] };
  }

  const postGenRetention = await runPostGenerationRetentionEmailCron();
  errors.push(...postGenRetention.errors);

  return {
    freeDrip: freeStats,
    trial,
    postGenRetention: {
      loopCloser48h: postGenRetention.loopCloser48h,
      coldTrial: postGenRetention.coldTrial,
    },
    errors,
  };
}
