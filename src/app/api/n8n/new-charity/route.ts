import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyNewCharitySignup } from '@/lib/n8n-webhooks'

/**
 * Internal route called by the onboarding page after org creation.
 * Fires the n8n Workflow 2 webhook (server-side so N8N_BASE_URL stays private).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { orgId, orgName, charityNumber, country } = await req.json()

    // Fire-and-forget — don't await, just let it go
    notifyNewCharitySignup({
      userId:        user.id,
      orgId:         orgId ?? '',
      email:         user.email ?? '',
      orgName:       orgName ?? '',
      charityNumber: charityNumber ?? null,
      country:       country ?? 'England',
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never fail the signup flow due to webhook issues
    return NextResponse.json({ ok: true })
  }
}
