import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Kept as a compatibility response for old bookmarks and stale clients. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Trial checkout is retired. Purchase Handover or run the free PSA scan.",
    },
    { status: 410 },
  );
}
