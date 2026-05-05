import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { getHaloToken } from "@/lib/halo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fieldName = searchParams.get("field")?.trim();
    if (!fieldName) return NextResponse.json({ error: "field param required" }, { status: 400 });

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createServiceRoleClient();
    const { data: conn } = await admin
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn) return NextResponse.json({ exists: false, message: "HaloPSA not connected" });

    const clientSecret = decrypt(conn.client_secret_encrypted);
    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    });

    const res = await fetch(`${conn.halo_url}/api/CustomField`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[halo/custom-fields/test] CustomField response:', res.status, errText.slice(0, 200))
      
      // Try alternative endpoints
      const altEndpoints = ['/api/CustomFields', '/api/Field', '/api/CustomField?type=ticket']
      for (const endpoint of altEndpoints) {
        const altRes = await fetch(`${conn.halo_url}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (altRes.ok) {
          const altData = await altRes.json() as unknown
          const altFields = Array.isArray(altData)
            ? altData
            : (altData as { customfields?: unknown[] }).customfields ?? []
          const match = (altFields as Array<{ name?: string; label?: string }>).find(f =>
            f.name?.toLowerCase() === fieldName.toLowerCase() ||
            f.label?.toLowerCase() === fieldName.toLowerCase() ||
            `CF${f.name}`.toLowerCase() === fieldName.toLowerCase()
          )
          if (match) {
            return NextResponse.json({ exists: true, message: `Field found: "${match.label ?? match.name}"` })
          }
          return NextResponse.json({ exists: false, message: `Field "${fieldName}" not found. Available fields fetched from ${endpoint}.` })
        }
      }
      
      return NextResponse.json({ exists: false, message: `Could not fetch custom fields from HaloPSA (status: ${res.status}). The API endpoint may not be available on your instance.` })
    }

    const data = (await res.json()) as unknown;
    const fields = Array.isArray(data)
      ? data
      : (data as { customfields?: unknown[] }).customfields ?? [];

    const match = (fields as Array<{ name?: string; label?: string }>).find(
      (f) =>
        f.name?.toLowerCase() === fieldName.toLowerCase() ||
        f.label?.toLowerCase() === fieldName.toLowerCase() ||
        `CF${f.name}`.toLowerCase() === fieldName.toLowerCase(),
    );

    if (match) {
      return NextResponse.json({
        exists: true,
        message: `Field found: "${match.label ?? match.name}"`,
      });
    }

    return NextResponse.json({
      exists: false,
      message: `Field "${fieldName}" not found in HaloPSA. Check spelling and ensure it starts with "CF".`,
    });
  } catch (e) {
    console.error("[halo/custom-fields/test]", e);
    return NextResponse.json({ exists: false, message: "Error connecting to HaloPSA" });
  }
}
