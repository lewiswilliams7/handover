import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { decrypt } from "@/lib/encryption"
import { getHaloToken } from "@/lib/halo"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createServiceRoleClient()
    const { data: conn } = await admin
      .from("halo_connections")
      .select("halo_url, tenant, client_id, client_secret_encrypted")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!conn) return NextResponse.json({ fields: [] })

    const clientSecret = decrypt(conn.client_secret_encrypted)
    const token = await getHaloToken({
      haloUrl: conn.halo_url,
      tenant: conn.tenant,
      clientId: conn.client_id,
      clientSecret,
    })

    // Try multiple endpoints
    const endpoints = ["/api/CustomField", "/api/CustomFields", "/api/Field"]
    for (const endpoint of endpoints) {
      const res = await fetch(`${conn.halo_url}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json() as unknown
        const raw = Array.isArray(data)
          ? data
          : (data as { customfields?: unknown[]; fields?: unknown[] }).customfields
            ?? (data as { fields?: unknown[] }).fields
            ?? []
        const fields = (raw as Array<{ name?: string; label?: string; id?: number }>)
          .filter(f => f.name)
          .map(f => ({
            name: f.name ?? "",
            label: f.label ?? f.name ?? "",
          }))
        return NextResponse.json({ fields })
      }
    }

    return NextResponse.json({ fields: [] })
  } catch (e) {
    console.error("[halo/customfields/list]", e)
    return NextResponse.json({ fields: [] })
  }
}
