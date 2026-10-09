import { NextResponse } from "next/server";

import { sendTeamInviteEmail } from "@/lib/emails";
import { getAppOrigin } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { isKnownTeamStripePriceId } from "@/lib/stripe-price-ids";
import {
  TEAM_MEMBER_INVITES_BLOCKED_MESSAGE,
  profilePlanBlocksTeamMemberInvites,
  teamGenerationLimitForSeats,
  teamWorkspaceAllowsMemberInvites,
} from "@/lib/utils/getPlan";
import { buildHandoverResendFromHeader } from "@/lib/resend-from-header";
import { requireTeamManagementPlanTier } from "@/lib/server/requireTeamManagementPlan";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  email?: string;
  role?: string;
  /** User confirmed adding a billable seat when the team is at capacity on a paid Growth plan. */
  confirmPaidSeat?: boolean;
};

function priceIdFromItem(item: { price?: unknown }): string {
  const p = item.price;
  if (typeof p === "string") return p;
  if (p && typeof p === "object" && "id" in p && typeof (p as { id: unknown }).id === "string") {
    return (p as { id: string }).id;
  }
  return "";
}

async function findTeamStripeSubscription(stripeCustomerId: string) {
  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 30,
  });
  const activeLike = subs.data.filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );
  return (
    activeLike.find((s) => (s.metadata?.plan ?? "").toLowerCase() === "team") ??
    activeLike.find((s) => s.items.data.some((i) => isKnownTeamStripePriceId(priceIdFromItem(i))))
  );
}

async function expandTeamPaidSeatQuantity(opts: {
  admin: ReturnType<typeof createServiceRoleClient>;
  teamId: string;
  stripeCustomerId: string;
  newQuantity: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { admin, teamId, stripeCustomerId, newQuantity } = opts;
  const stripe = getStripe();
  const teamSub = await findTeamStripeSubscription(stripeCustomerId);
  if (!teamSub?.items.data[0]) {
    return { ok: false, message: "No active team subscription found." };
  }
  const item = teamSub.items.data[0];
  const itemId = item.id;
  const currentQty = item.quantity ?? 1;
  const genLimit = teamGenerationLimitForSeats(newQuantity);

  if (newQuantity <= currentQty) {
    const { error: upErr } = await admin
      .from("teams")
      .update({
        seat_limit: newQuantity,
        generation_limit: genLimit,
      })
      .eq("id", teamId);
    if (upErr) {
      console.error("[team/invite] seat_limit sync:", upErr.message);
      return { ok: false, message: "Could not update seat limit." };
    }
    return { ok: true };
  }

  try {
    await stripe.subscriptions.update(teamSub.id, {
      items: [{ id: itemId, quantity: newQuantity }],
      proration_behavior: "create_prorations",
    });
  } catch (e) {
    console.error("[team/invite] Stripe subscription update:", e);
    return { ok: false, message: "Could not update subscription seats. Try again or use the billing portal." };
  }

  const { error: upErr } = await admin
    .from("teams")
    .update({
      seat_limit: newQuantity,
      generation_limit: genLimit,
    })
    .eq("id", teamId);
  if (upErr) {
    console.error("[team/invite] teams update after Stripe:", upErr.message);
    return { ok: false, message: "Subscription updated but seat limit could not be saved. Contact support." };
  }
  return { ok: true };
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

    const tierGate = await requireTeamManagementPlanTier(user.id);
    if (tierGate) return tierGate;

    const admin = createServiceRoleClient();

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("team_id, plan, trial_plan, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[team/invite] profile:", profileErr.message);
      return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
    }

    if (profilePlanBlocksTeamMemberInvites(profile ?? {})) {
      return NextResponse.json({ error: TEAM_MEMBER_INVITES_BLOCKED_MESSAGE }, { status: 403 });
    }

    const teamId =
      profile?.team_id && typeof profile.team_id === "string" ? profile.team_id : null;
    if (!teamId) {
      return NextResponse.json({ error: "No team found." }, { status: 404 });
    }

    const { data: membership, error: memErr } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) {
      console.error("[team/invite] membership:", memErr.message);
      return NextResponse.json({ error: "Could not verify membership." }, { status: 500 });
    }

    const role = membership?.role;
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const inviteRole = body.role === "admin" ? "admin" : "member";
    const confirmPaidSeat = body.confirmPaidSeat === true;

    const { data: team, error: teamErr } = await admin
      .from("teams")
      .select("name, seat_limit, plan, stripe_customer_id, subscription_status")
      .eq("id", teamId)
      .maybeSingle();

    if (teamErr || !team) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    if (!teamWorkspaceAllowsMemberInvites(team.plan ?? null)) {
      return NextResponse.json({ error: TEAM_MEMBER_INVITES_BLOCKED_MESSAGE }, { status: 403 });
    }

    const seatLimit =
      typeof team.seat_limit === "number" && team.seat_limit >= 3 ? team.seat_limit : 3;

    const { count: memberCount, error: cErr } = await admin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId);

    if (cErr) {
      console.error("[team/invite] member count:", cErr.message);
      return NextResponse.json({ error: "Could not check seat limit." }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const { count: pendingCount, error: pErr } = await admin
      .from("team_invites")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("accepted", false)
      .gt("expires_at", nowIso);

    if (pErr) {
      console.error("[team/invite] pending count:", pErr.message);
      return NextResponse.json({ error: "Could not check seat limit." }, { status: 500 });
    }

    const used = (memberCount ?? 0) + (pendingCount ?? 0);
    if (used >= seatLimit) {
      const cust =
        typeof team.stripe_customer_id === "string" ? team.stripe_customer_id.trim() : "";
      const canPaidExpand =
        team.plan === "team" &&
        (team.subscription_status === "active" ||
          team.subscription_status === "trialing" ||
          team.subscription_status === "past_due") &&
        cust.length > 0;

      if (!canPaidExpand) {
        return NextResponse.json({ error: "Seat limit reached" }, { status: 400 });
      }

      if (!confirmPaidSeat) {
        const teamSub = await findTeamStripeSubscription(cust);
        const interval =
          teamSub?.items.data[0]?.price &&
          typeof teamSub.items.data[0].price === "object" &&
          "recurring" in teamSub.items.data[0].price &&
          teamSub.items.data[0].price.recurring?.interval === "year"
            ? "year"
            : "month";
        return NextResponse.json(
          {
            error: "Adding this member requires an extra paid seat.",
            code: "NEEDS_CONFIRM",
            billingInterval: interval,
          },
          { status: 409 },
        );
      }

      const newQty = used + 1;
      const expanded = await expandTeamPaidSeatQuantity({
        admin,
        teamId,
        stripeCustomerId: cust,
        newQuantity: newQty,
      });
      if (!expanded.ok) {
        return NextResponse.json({ error: expanded.message }, { status: 400 });
      }
    }

    const { data: invite, error: invErr } = await admin
      .from("team_invites")
      .insert({
        team_id: teamId,
        invited_by: user.id,
        email,
        role: inviteRole,
      })
      .select("id, team_id, invited_by, email, role, token, expires_at, created_at, accepted")
      .single();

    if (invErr || !invite?.token) {
      console.error("[team/invite] insert:", invErr?.message);
      return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || getAppOrigin().replace(/\/$/, "");
    const joinUrl = `${origin}/join?token=${encodeURIComponent(invite.token)}`;

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("display_name, first_name, last_name, company_name, brand_name")
      .eq("id", user.id)
      .maybeSingle();

    try {
      await sendTeamInviteEmail({
        to: email,
        teamName: typeof team.name === "string" && team.name.trim() ? team.name : "your team",
        joinUrl,
        from: buildHandoverResendFromHeader(inviterProfile),
      });
    } catch (e) {
      console.error("[team/invite] email:", e);
      await admin.from("team_invites").delete().eq("id", invite.id);
      return NextResponse.json(
        { error: "Invite was created but the email could not be sent. Try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json(invite);
  } catch (e) {
    console.error("[team/invite]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
