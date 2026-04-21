import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Called by a cron job or scheduled task every Monday
export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Get all pro users with grants closing this month
    const { data: matches } = await supabase
      .from('grant_matches')
      .select('user_id, grant:grants(name, deadline)')
      .gte('grant.deadline', now.toISOString().split('T')[0])
      .lte('grant.deadline', in30Days.toISOString().split('T')[0])

    if (!matches || matches.length === 0) return NextResponse.json({ ok: true })

    const byUser: Record<string, string[]> = {}
    for (const m of matches) {
      if (!byUser[m.user_id]) byUser[m.user_id] = []
      if (m.grant && typeof m.grant === 'object' && 'name' in m.grant) {
        byUser[m.user_id].push((m.grant as { name: string }).name)
      }
    }

    const userIds = Object.keys(byUser)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan')
      .in('id', userIds)
      .eq('plan', 'pro')

    for (const profile of profiles ?? []) {
      const grantNames = byUser[profile.id] ?? []
      if (grantNames.length === 0) continue
      const firstName = profile.full_name?.split(' ')[0] ?? 'there'

      await resend.emails.send({
        from: 'GrantRadar <hello@grantredar.co.uk>',
        to: profile.email,
        subject: `You have ${grantNames.length} grant${grantNames.length > 1 ? 's' : ''} closing this month`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #F4F6F5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
    <div style="background: #0F4C35; padding: 32px;">
      <h1 style="color: white; font-size: 22px; margin: 0; font-family: Georgia, serif;">Your weekly grant digest</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #0D1117;">Hi ${firstName},</p>
      <p style="color: #4B5563; line-height: 1.6;">
        You have <strong>${grantNames.length} grant${grantNames.length > 1 ? 's' : ''}</strong> closing this month:
      </p>
      <ul style="color: #4B5563; line-height: 2;">
        ${grantNames.map((g) => `<li>${g}</li>`).join('')}
      </ul>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="background: #0F4C35; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
          View deadline alerts →
        </a>
      </div>
    </div>
  </div>
</body>
</html>
        `,
      })
    }

    return NextResponse.json({ ok: true, sent: profiles?.length ?? 0 })
  } catch (err) {
    console.error('Digest email error:', err)
    return NextResponse.json({ error: 'Failed to send digests' }, { status: 500 })
  }
}
