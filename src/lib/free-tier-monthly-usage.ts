import type { SupabaseClient } from "@supabase/supabase-js";

export function freeTierUsageMonthKeyUtc(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type UsageRow = {
  month: string;
  halo_push_count: number;
  scheduled_run_count: number;
};

async function loadUsageRow(
  supabase: SupabaseClient,
  userId: string,
  month: string,
): Promise<UsageRow> {
  const { data, error } = await supabase
    .from("free_tier_monthly_usage")
    .select("month, halo_push_count, scheduled_run_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[free-tier-usage] select:", error.message);
    return { month, halo_push_count: 0, scheduled_run_count: 0 };
  }

  if (!data) {
    const { error: insErr } = await supabase.from("free_tier_monthly_usage").insert({
      user_id: userId,
      month,
      halo_push_count: 0,
      scheduled_run_count: 0,
    });
    if (insErr && (insErr as { code?: string }).code !== "23505") {
      console.warn("[free-tier-usage] insert:", insErr.message);
    }
    return { month, halo_push_count: 0, scheduled_run_count: 0 };
  }

  const row = data as UsageRow;
  if (row.month !== month) {
    const { error: upErr } = await supabase
      .from("free_tier_monthly_usage")
      .update({
        month,
        halo_push_count: 0,
        scheduled_run_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (upErr) console.warn("[free-tier-usage] month reset:", upErr.message);
    return { month, halo_push_count: 0, scheduled_run_count: 0 };
  }
  return row;
}

/** Basic (`free`) plan users: max 1 Halo push-back per UTC month. */
export async function assertFreeHaloPushAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const month = freeTierUsageMonthKeyUtc();
  const row = await loadUsageRow(supabase, userId, month);
  return row.halo_push_count < 1;
}

export async function incrementFreeHaloPushCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const month = freeTierUsageMonthKeyUtc();
  const row = await loadUsageRow(supabase, userId, month);
  await supabase
    .from("free_tier_monthly_usage")
    .update({
      halo_push_count: row.halo_push_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

/** Basic (`free`) plan users: max 1 scheduled report execution per UTC month. */
export async function assertFreeScheduledRunAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const month = freeTierUsageMonthKeyUtc();
  const row = await loadUsageRow(supabase, userId, month);
  return row.scheduled_run_count < 1;
}

export async function incrementFreeScheduledRunCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const month = freeTierUsageMonthKeyUtc();
  const row = await loadUsageRow(supabase, userId, month);
  await supabase
    .from("free_tier_monthly_usage")
    .update({
      scheduled_run_count: row.scheduled_run_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

/** Force free-tier safe flags on scheduled report payloads. */
export function clampScheduledReportForFreeTier<T extends { attach_excel?: boolean; push_to_halo?: boolean; halo_push_excel?: boolean }>(
  payload: T,
): T {
  return {
    ...payload,
    attach_excel: false,
    push_to_halo: false,
    halo_push_excel: false,
  };
}
