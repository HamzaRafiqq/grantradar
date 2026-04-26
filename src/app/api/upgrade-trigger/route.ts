import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyUpgradeTrigger } from '@/lib/n8n-webhooks'

export async function POST(req: Request) {
  try {
    const { grantId, triggerType, grantTitle, grantFunder } = await req.json()
    if (!grantId || !triggerType) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    // Record the trigger event in DB
    await supabase.from('upgrade_triggers').insert({
      user_id: user.id,
      grant_id: grantId,
      trigger_type: triggerType,
    })

    // Look up the user's email + org name for the n8n email
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    // Only fire the n8n workflow if user is genuinely on free
    if (profile?.plan === 'free') {
      const { data: org } = await supabase
        .from('organisations')
        .select('name')
        .eq('user_id', user.id)
        .single()

      // Fire-and-forget — Workflow 4 waits 1hr then sends the email
      notifyUpgradeTrigger({
        userId:      user.id,
        email:       user.email ?? '',
        orgName:     org?.name ?? 'there',
        grantId,
        grantTitle:  grantTitle  ?? 'a grant',
        grantFunder: grantFunder ?? '',
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
