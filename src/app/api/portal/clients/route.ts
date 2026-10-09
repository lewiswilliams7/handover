import { NextResponse } from "next/server";

import { isValidPortalSlug, sanitizePortalClientSlug } from "@/lib/portal/slug";
import {
  getPortalAccountForMspUser,
  requireEnterprisePlan,
  requireHandoverUserId,
} from "@/lib/server/portal-msp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) {
      return NextResponse.json({ error: "Set up your portal account first." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: clients, error } = await admin
      .from("portal_clients")
      .select("*")
      .eq("portal_account_id", account.id)
      .order("client_name", { ascending: true });

    if (error) {
      console.error("[portal/clients GET]", error.message);
      return NextResponse.json({ error: "Could not load clients." }, { status: 500 });
    }

    const rows = clients ?? [];
    const counts = await Promise.all(
      rows.map(async (c) => {
        const { count, error: cErr } = await admin
          .from("portal_client_users")
          .select("id", { count: "exact", head: true })
          .eq("portal_client_id", c.id);
        if (cErr) return { id: c.id, user_count: 0 };
        return { id: c.id, user_count: count ?? 0 };
      }),
    );
    const countById = new Map(counts.map((x) => [x.id, x.user_count]));

    return NextResponse.json({
      clients: rows.map((c) => ({
        ...c,
        user_count: countById.get(c.id) ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireHandoverUserId();
    await requireEnterprisePlan(userId);
    const account = await getPortalAccountForMspUser(userId);
    if (!account?.id) {
      return NextResponse.json({ error: "Set up your portal account first." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      client_name?: string;
      client_id?: string | number;
      slug?: string;
      psa_source?: string;
      visibility_tickets?: boolean;
      visibility_projects?: boolean;
      visibility_rag?: boolean;
      visibility_reports?: boolean;
      visibility_ticket_notes?: boolean;
    };

    const clientName = String(body.client_name ?? "").trim();
    const clientId = String(body.client_id ?? "").trim();
    const slug = sanitizePortalClientSlug(String(body.slug ?? ""));
    const psaSource = String(body.psa_source ?? "halopsa").toLowerCase();
    if (!clientName || !clientId) {
      return NextResponse.json({ error: "client_name and client_id are required." }, { status: 400 });
    }
    if (!isValidPortalSlug(slug)) {
      return NextResponse.json({ error: "Invalid slug format." }, { status: 400 });
    }
    if (psaSource !== "halopsa" && psaSource !== "connectwise") {
      return NextResponse.json({ error: "psa_source must be halopsa or connectwise." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: taken } = await admin
      .from("portal_clients")
      .select("id")
      .eq("portal_account_id", account.id)
      .eq("slug", slug)
      .maybeSingle();
    if (taken?.id) {
      return NextResponse.json({ error: "Slug already used for another client portal." }, { status: 409 });
    }

    const insert = {
      portal_account_id: account.id,
      client_name: clientName,
      client_id: clientId,
      slug,
      psa_source: psaSource,
      enabled: true,
      visibility_tickets: body.visibility_tickets !== false,
      visibility_projects: body.visibility_projects !== false,
      visibility_rag: body.visibility_rag !== false,
      visibility_reports: body.visibility_reports === true,
      visibility_ticket_notes: body.visibility_ticket_notes !== false,
    };

    const { data: client, error } = await admin.from("portal_clients").insert(insert).select("*").single();
    if (error) {
      console.error("[portal/clients POST]", error.message);
      return NextResponse.json(
        { error: "Could not save portal client. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ client });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "growth_required" || msg === "enterprise_required") {
      return NextResponse.json({ error: "An active Handover plan is required." }, { status: 403 });
    }
    console.error("[portal/clients POST]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
