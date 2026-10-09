import { NextRequest, NextResponse } from "next/server";
import { buildExactClientFilter } from "@/lib/server/ci-generation-filter";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientName = searchParams.get("client");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const limitParam = searchParams.get("limit");
    const limit = clientName
      ? 100
      : Math.min(
          200,
          Math.max(1, parseInt(limitParam ?? "200", 10) || 200),
        );

    let query = supabase
      .from("generations")
      .select(
        "id, project_name, client_name_extracted, title, created_at, report_type, source, output_json",
      )
      .eq("user_id", user.id);

    if (clientName) {
      query = query.or(buildExactClientFilter(clientName));
    }

    query = query.order("created_at", { ascending: false }).limit(limit);

    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }
    if (type && type !== "all") {
      query = query.eq("report_type", type);
    }

    const { data: rawData, error } = await query;
    if (error) throw error;

    const data = (rawData ?? []) as Array<{
      id: string;
      project_name: string | null;
      client_name_extracted: string | null;
      title: string | null;
      created_at: string;
      report_type: string | null;
      source: string | null;
      output_json: Record<string, unknown> | null;
    }>;

    // Extract lightweight summary from output_json for list view
    const generations = data.map((gen) => ({
      id: gen.id,
      title: gen.title || gen.project_name,
      clientName:
        (typeof gen.client_name_extracted === "string"
          ? gen.client_name_extracted.trim()
          : "") ||
        (typeof gen.project_name === "string" ? gen.project_name.trim() : "") ||
        null,
      createdAt: gen.created_at,
      reportType: gen.report_type,
      source: gen.source,
      summaryPreview:
        typeof gen.output_json === "object" &&
        gen.output_json !== null &&
        "summary" in gen.output_json
          ? String(
              (gen.output_json as Record<string, unknown>).summary ?? "",
            ).slice(0, 150)
          : "",
      actionCount: Array.isArray(
        (gen.output_json as Record<string, unknown>)?.actions,
      )
        ? ((gen.output_json as Record<string, unknown>).actions as unknown[])
            .length
        : 0,
      riskCount: Array.isArray(
        (gen.output_json as Record<string, unknown>)?.risks,
      )
        ? ((gen.output_json as Record<string, unknown>).risks as unknown[])
            .length
        : 0,
      // Full output for expanded view
      outputJson: gen.output_json,
    }));

    return NextResponse.json({ generations });
  } catch (e) {
    console.error("[ci/history]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
