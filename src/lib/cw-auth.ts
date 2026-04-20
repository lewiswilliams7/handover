import { decrypt } from "@/lib/encryption";
import { normalizeConnectWiseSiteUrl } from "@/lib/psa/connectwise";
import { createServerClient } from "@/lib/supabase/server";

type CwRow = {
  site_url: string;
  company_id: string;
  client_id: string;
  public_key_encrypted: string;
  private_key_encrypted: string;
};

export async function getCWConnectionForUser(userId: string): Promise<{
  siteUrl: string;
  clientId: string;
  companyId: string;
  publicKey: string;
  privateKey: string;
}> {
  const supabase = await createServerClient();
  const { data: row, error } = await supabase
    .from("cw_connections")
    .select("site_url, company_id, client_id, public_key_encrypted, private_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle<CwRow>();

  if (error || !row) {
    throw new Error("ConnectWise is not connected yet.");
  }

  return {
    siteUrl: normalizeConnectWiseSiteUrl(row.site_url),
    clientId: row.client_id,
    companyId: row.company_id,
    publicKey: decrypt(row.public_key_encrypted),
    privateKey: decrypt(row.private_key_encrypted),
  };
}

export async function getCWAuthHeaders(userId: string): Promise<{
  Authorization: string;
  clientId: string;
  "Content-Type": string;
}> {
  const conn = await getCWConnectionForUser(userId);
  const auth = Buffer.from(
    `${conn.companyId}+${conn.publicKey}:${conn.privateKey}`,
    "utf8",
  ).toString("base64");

  return {
    Authorization: `Basic ${auth}`,
    clientId: conn.clientId,
    "Content-Type": "application/json",
  };
}

