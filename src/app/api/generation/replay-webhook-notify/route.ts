import { NextResponse } from "next/server";

import { notifyHandoverGenerationWebhooks } from "@/lib/chat-generation-notify";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Re-sends the same Slack / Teams generation notification used after a successful run,
 * using the current outputs payload (Pro+ only; same rules as notifyHandoverGenerationWebhooks).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      outputs?: unknown;
      projectName?: unknown;
      savedGenerationId?: unknown;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.outputs || typeof body.outputs !== "object") {
      return NextResponse.json({ error: "outputs object is required." }, { status: 400 });
    }

    const projectName =
      typeof body.projectName === "string" ? body.projectName.trim() : "";
    const savedGenerationId =
      typeof body.savedGenerationId === "string" && body.savedGenerationId.trim()
        ? body.savedGenerationId.trim()
        : null;

    await notifyHandoverGenerationWebhooks({
      supabase,
      userId: user.id,
      parsed: body.outputs as Record<string, unknown>,
      projectName: projectName || null,
      savedGenerationId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[replay-webhook-notify]", e);
    return NextResponse.json({ error: "Notify failed." }, { status: 500 });
  }
}
