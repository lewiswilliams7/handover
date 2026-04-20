import { NextResponse } from "next/server";

import { runUpgradeNudgeForUser } from "@/lib/email-triggers";
import { verifyHandoverInternalEmailSecret } from "@/lib/internal-email-secret";

export async function POST(request: Request) {
  if (!verifyHandoverInternalEmailSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.userId !== "string" || !body.userId.trim()) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await runUpgradeNudgeForUser(body.userId.trim());

  return NextResponse.json({ success: true });
}
