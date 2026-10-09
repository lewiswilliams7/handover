import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** New trial creation is retired; legacy trial records remain readable. */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Trials are no longer available. Start with the free PSA scan.",
    },
    { status: 410 },
  );
}
