import { NextResponse } from "next/server";

import { EmailId, profileHasEmailSent } from "@/lib/emails-sent";
import { sendTrialWelcomeEmail } from "@/lib/emails";
import { appendProfileEmailSentIfAbsent } from "@/lib/profile-emails-sent";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  getPlanTierFromFields,
  isSoloSubscriptionLive,
  normalizePlanLabel,
  planFieldsFromProfileRow,
  type UserPlanFields,
} from "@/lib/utils/getPlan";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  plan?: string;
};

function isPaidSoloSku(fields: UserPlanFields): boolean {
  const p = normalizePlanLabel(fields.plan ?? "");
  const canon = p === "pro" ? "professional" : p;
  if (canon === "professional_trial" || canon === "team_trial") return false;
  if (canon === "enterprise" || canon === "team" || canon === "professional") {
    return isSoloSubscriptionLive(fields.subscription_status);
  }
  return false;
}

/** In-app trial active: future end date and tier access from trial (solo). */
function hasActiveSoloAppTrial(fields: UserPlanFields): boolean {
  const end = fields.trial_ends_at;
  if (!end || new Date(end).getTime() <= Date.now()) return false;
  return getPlanTierFromFields(fields) >= 1;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: Body = {};
    try {
      const ct = request.headers.get("content-type");
      if (ct?.includes("application/json")) {
        body = (await request.json()) as Body;
      }
    } catch {
      body = {};
    }

    const raw = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
    const trialPlanSku =
      raw === "team" ? "team" : raw === "professional" ? "professional" : null;
    if (!trialPlanSku) {
      return NextResponse.json(
        { error: "Invalid plan. Use professional or team." },
        { status: 400 },
      );
    }

    const targetPlan = trialPlanSku === "team" ? "team_trial" : "professional_trial";
    console.log("[trial/start] setting trial plan", {
      userId: user.id,
      requestPlan: raw,
      trialPlanSku,
      targetPlan,
    });

    const { data: profileRow, error: selErr } = await supabase
      .from("profiles")
      .select(
        "plan, team_id, stripe_customer_id, subscription_status, trial_ends_at, trial_plan, first_name, display_name, emails_sent",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (selErr) {
      console.error("[trial/start] select", selErr);
      return NextResponse.json({ error: "Could not read profile." }, { status: 500 });
    }

    const fields = planFieldsFromProfileRow(profileRow);
    if (typeof fields.team_id === "string" && fields.team_id.trim().length > 0) {
      return NextResponse.json(
        { ok: false, error: "Team billing applies to this account." },
        { status: 403 },
      );
    }

    if (isPaidSoloSku(fields)) {
      return NextResponse.json(
        { ok: false, error: "You already have an active subscription." },
        { status: 403 },
      );
    }

    if (hasActiveSoloAppTrial(fields)) {
      return NextResponse.json({
        ok: true,
        idempotent: true,
        plan: typeof profileRow?.plan === "string" ? profileRow.plan : targetPlan,
        trial_plan:
          typeof profileRow?.trial_plan === "string" && profileRow.trial_plan.trim()
            ? profileRow.trial_plan.trim()
            : trialPlanSku,
        trial_ends_at:
          typeof fields.trial_ends_at === "string" ? fields.trial_ends_at.trim() : null,
      });
    }

    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const admin = createServiceRoleClient();
    const { error: updErr } = await admin
      .from("profiles")
      .update({
        plan: targetPlan,
        trial_ends_at: trialEnds,
        trial_plan: trialPlanSku,
      })
      .eq("id", user.id);

    if (updErr) {
      console.error("[trial/start]", updErr);
      return NextResponse.json({ error: "Could not start trial." }, { status: 500 });
    }

    const email = user.email?.trim();
    const alreadyWelcomed =
      profileHasEmailSent(profileRow?.emails_sent, EmailId.TRIAL_WELCOME) ||
      profileHasEmailSent(profileRow?.emails_sent, EmailId.TRIAL_SEQ_STARTED);
    if (email && !alreadyWelcomed) {
      const fn =
        typeof profileRow?.first_name === "string" && profileRow.first_name.trim()
          ? profileRow.first_name.trim()
          : typeof profileRow?.display_name === "string" && profileRow.display_name.trim()
            ? profileRow.display_name.trim().split(/\s+/)[0]
            : null;
      try {
        await sendTrialWelcomeEmail({
          to: email,
          trialEndsAtIso: trialEnds,
          planLabel: trialPlanSku === "team" ? "Team" : "Professional",
          firstName: fn,
        });
        try {
          await appendProfileEmailSentIfAbsent(admin, user.id, EmailId.TRIAL_WELCOME);
        } catch (e) {
          console.error("[trial/start] emails_sent append:", e);
        }
      } catch (e) {
        console.error("[trial/start] welcome email:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      plan: targetPlan,
      trial_plan: trialPlanSku,
      trial_ends_at: trialEnds,
    });
  } catch (e) {
    console.error("[trial/start]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
