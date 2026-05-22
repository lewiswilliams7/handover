import {
  sendTrialDay3InactiveEmail,
  sendTrialSequenceDay10CallEmail,
  sendTrialSequenceExpiredDayEmail,
  sendTrialSequenceHalfwayEmail,
  sendTrialSequencePostExpiryEmail,
  sendTrialSequenceTwoDaysLeftEmail,
} from "@/lib/emails";
import { EmailId, profileHasEmailSent } from "@/lib/emails-sent";
import {
  addUtcDaysMs,
  parseIsoToUtcDay,
  utcCalendarDay,
} from "@/lib/email-cron-dates";
import { appendProfileEmailSentIfAbsent } from "@/lib/profile-emails-sent";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  isSoloSubscriptionLive,
  normalizePlanLabel,
  planFieldsFromProfileRow,
} from "@/lib/utils/getPlan";

type ProfileTrialRow = {
  id: string;
  email: string | null;
  plan: string | null;
  first_name: string | null;
  display_name: string | null;
  trial_ends_at: string | null;
  trial_plan: string | null;
  subscription_status: string | null;
  team_id: string | null;
  emails_sent: unknown;
  total_generations: number | null;
};

function firstNameFromRow(row: ProfileTrialRow): string {
  const fn = typeof row.first_name === "string" ? row.first_name.trim() : "";
  if (fn) return fn;
  const dn = typeof row.display_name === "string" ? row.display_name.trim() : "";
  if (dn) return dn.split(/\s+/)[0] ?? "there";
  return "there";
}

function isPaidSoloSubscription(row: ProfileTrialRow): boolean {
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

function trialPlanSkuFromRow(row: ProfileTrialRow): "professional" | "team" {
  const p = normalizePlanLabel(row.plan ?? "");
  if (p === "team_trial") return "team";
  const tp = normalizePlanLabel(row.trial_plan ?? "");
  if (tp === "team") return "team";
  return "professional";
}

/**
 * Daily: trial lifecycle emails relative to trial_ends_at (14-day window from start).
 */
export async function runTrialSequenceEmailCron(): Promise<{
  attempted: number;
  sent: Record<string, number>;
  errors: string[];
}> {
  const sent: Record<string, number> = {
    [EmailId.TRIAL_SEQ_STARTED]: 0,
    [EmailId.TRIAL_DAY3_INACTIVE]: 0,
    [EmailId.TRIAL_SEQ_HALFWAY]: 0,
    [EmailId.TRIAL_SEQ_DAY10_CALL]: 0,
    [EmailId.TRIAL_SEQ_2_DAYS]: 0,
    [EmailId.TRIAL_SEQ_EXPIRED_DAY]: 0,
    [EmailId.TRIAL_SEQ_POST_EXPIRY]: 0,
  };
  const errors: string[] = [];
  let attempted = 0;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    errors.push(`service_role: ${e instanceof Error ? e.message : String(e)}`);
    return { attempted: 0, sent, errors };
  }

  const now = new Date();
  const today = utcCalendarDay(now);

  let offset = 0;
  const page = 500;
  for (;;) {
    const { data: rows, error: qErr } = await admin
      .from("profiles")
      .select(
        "id, email, plan, first_name, display_name, trial_ends_at, trial_plan, subscription_status, team_id, emails_sent, total_generations",
      )
      .not("trial_ends_at", "is", null)
      .is("team_id", null)
      .range(offset, offset + page - 1);

    if (qErr) {
      errors.push(`profiles select: ${qErr.message}`);
      break;
    }
    const batch = (rows ?? []) as ProfileTrialRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (isPaidSoloSubscription(row)) continue;

      const trialEnds = row.trial_ends_at?.trim();
      if (!trialEnds) continue;
      const endMs = Date.parse(trialEnds);
      if (!Number.isFinite(endMs)) continue;

      const plan = normalizePlanLabel(row.plan ?? "");
      if (plan !== "professional_trial" && plan !== "team_trial") continue;

      attempted += 1;

      const trialStartMs = endMs - 14 * 86_400_000;
      const day3 = utcCalendarDay(new Date(trialStartMs + 3 * 86_400_000));
      const day7 = utcCalendarDay(new Date(trialStartMs + 7 * 86_400_000));
      const day10 = utcCalendarDay(new Date(trialStartMs + 10 * 86_400_000));
      const twoDaysBeforeEnd = utcCalendarDay(new Date(addUtcDaysMs(trialEnds, -2)));
      const endDay = parseIsoToUtcDay(trialEnds);
      const threeDaysAfterEndMs = endMs + 3 * 86_400_000;
      const threeDaysAfterEndDay = utcCalendarDay(new Date(threeDaysAfterEndMs));

      const emailTo = row.email?.trim();
      if (!emailTo) {
        const { data: u } = await admin.auth.admin.getUserById(row.id);
        const ue = u.user?.email?.trim();
        if (!ue) continue;
        row.email = ue;
      }
      const to = row.email!.trim();
      const firstName = firstNameFromRow(row);
      const sku = trialPlanSkuFromRow(row);

      const sendIfDue = async (id: string, fn: () => Promise<void>) => {
        if (profileHasEmailSent(row.emails_sent, id)) return;
        try {
          await fn();
          await appendProfileEmailSentIfAbsent(admin, row.id, id);
          sent[id] = (sent[id] ?? 0) + 1;
        } catch (e) {
          errors.push(`${id} ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      };

      const trialStillActive = endMs > now.getTime();

      // Day-1 welcome is sent only from POST /api/trial/start (Resend + emails_sent TRIAL_WELCOME).
      // Cron no longer sends TRIAL_SEQ_STARTED to avoid duplicate "trial started" emails.

      // Day 3 inactive trial (zero generations)
      if (trialStillActive && day3 === today && (row.total_generations ?? 0) === 0) {
        await sendIfDue(EmailId.TRIAL_DAY3_INACTIVE, async () => {
          await sendTrialDay3InactiveEmail({
            to,
            firstName,
            trialEndsAtIso: trialEnds,
          });
        });
      }

      // Day 7 halfway
      if (trialStillActive && day7 === today) {
        await sendIfDue(EmailId.TRIAL_SEQ_HALFWAY, async () => {
          await sendTrialSequenceHalfwayEmail({
            to,
            firstName,
            trialEndsAtIso: trialEnds,
            planSku: sku,
          });
        });
      }

      // Day 10 — call offer
      if (trialStillActive && day10 === today) {
        await sendIfDue(EmailId.TRIAL_SEQ_DAY10_CALL, async () => {
          await sendTrialSequenceDay10CallEmail({ to, firstName });
        });
      }

      // 2 days before end
      if (trialStillActive && twoDaysBeforeEnd === today) {
        await sendIfDue(EmailId.TRIAL_SEQ_2_DAYS, async () => {
          await sendTrialSequenceTwoDaysLeftEmail({
            to,
            firstName,
            trialEndsAtIso: trialEnds,
          });
        });
      }

      // Expiry calendar day
      if (endDay === today) {
        await sendIfDue(EmailId.TRIAL_SEQ_EXPIRED_DAY, async () => {
          await sendTrialSequenceExpiredDayEmail({ to, firstName });
        });
      }

      // 3 days after expiry, still not paid
      if (
        !trialStillActive &&
        threeDaysAfterEndDay === today &&
        !isPaidSoloSubscription(row)
      ) {
        const p = normalizePlanLabel(row.plan ?? "");
        const stillFreeOrTrial =
          p === "free" ||
          p === "basic" ||
          p === "professional_trial" ||
          p === "team_trial";
        if (stillFreeOrTrial) {
          await sendIfDue(EmailId.TRIAL_SEQ_POST_EXPIRY, async () => {
            await sendTrialSequencePostExpiryEmail(to, firstName);
          });
        }
      }
    }

    if (batch.length < page) break;
    offset += page;
  }

  return { attempted, sent, errors };
}
