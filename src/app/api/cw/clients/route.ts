import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { decrypt } from "@/lib/encryption"
import { fetchCWCompanies } from "@/lib/psa/connectwise"
import { isProUser } from "@/lib/plans"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceRoleClient()
    if (!(await isProUser(admin, user.id))) {
      return NextResponse.json({ error: 'pro_required' }, { status: 403 })
    }

    const { data: conn } = await admin
      .from('cw_connections')
      .select('site_url, company_id, public_key_encrypted, private_key_encrypted, client_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conn) return NextResponse.json({ error: 'ConnectWise not connected' }, { status: 400 })

    const publicKey = decrypt(conn.public_key_encrypted)
    const privateKey = decrypt(conn.private_key_encrypted)

    const companies = await fetchCWCompanies({
      siteUrl: conn.site_url,
      companyId: conn.company_id,
      publicKey,
      privateKey,
      clientId: conn.client_id,
    })

    return NextResponse.json({ clients: companies })
  } catch (e) {
    console.error('[cw/clients]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
