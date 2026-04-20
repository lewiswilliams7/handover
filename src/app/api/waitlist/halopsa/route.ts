import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

type WaitlistBody = {
  email?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WaitlistBody;
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("halopsa_waitlist").upsert(
      {
        email,
        user_id: user?.id ?? null,
      },
      { onConflict: "email" },
    );

    if (error) {
      return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist." }, { status: 500 });
  }
}
