import type { SupabaseClient } from "@supabase/supabase-js";

import type { ValueReceipt } from "@/lib/value-receipt";

/**
 * Log a receipt before it is emailed and return the id used in its open
 * pixel. Returns null when the table is not there yet: the receipt still
 * goes out, just without open tracking.
 */
export async function recordReceiptSend(
  admin: SupabaseClient,
  input: { userId: string; receipt: Pick<ValueReceipt, "clientId" | "clientName" | "period" | "periodLabel">; recipient: string },
): Promise<string | null> {
  if (!input.receipt.clientId) return null;
  const { data, error } = await admin
    .from("value_receipt_sends")
    .insert({
      user_id: input.userId,
      client_id: input.receipt.clientId,
      client_name: input.receipt.clientName.slice(0, 200),
      recipient: input.recipient.slice(0, 320),
      period: input.receipt.period,
      period_label: input.receipt.periodLabel.slice(0, 80),
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return String(data.id);
}
