import { NextRequest, NextResponse } from 'next/server'

// Cron: runs daily, sends alerts for grants closing in exactly 7 days
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return sendAlerts()
}

async function sendAlerts() {
  try {
    const { Resend } = await import('resend')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: matches } = await supabase
      .from('grant_matches')
      .select('user_id, grant:grants(name, funder, deadline, max_award, application_url)')
      .eq('grant.deadline', in7Days)
      .neq('status', 'lost')
      .neq('status', 'submitted')
      .neq('status', 'won')

    if (!matches || matches.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const byUser: Record<string, Array<{ name: string; funder: string; max_award: number; application_url: string }>> = {}
    for (const m of matches) {
      if (!m.grant || typeof m.grant !== 'object') continue
      if (!byUser[m.user_id]) byUser[m.user_id] = []
      byUser[m.user_id].push(m.grant as { name: string; funder: string; max_award: number; application_url: string })
    }

    const userIds = Object.keys(byUser)
    if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    let sent = 0
    for (const profile of profiles ?? []) {
      const grants = byUser[profile.id] ?? []
      if (!grants.length || !profile.email) continue
      const firstName = profile.full_name?.split(' ')[0] ?? 'there'

      const grantList = grants.map(g => `
        <div style="border-left:3px solid #EF4444;padding:12px 16px;margin-bottom:12px;background:#FFF5F5;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 4px;font-weight:600;color:#0D1117;font-size:14px;">${g.name}</p>
          <p style="margin:0 0 8px;color:#6B7280;font-size:12px;">${g.funder}${g.max_award ? ` · Up to ${g.max_award.toLocaleString()}` : ''}</p>
          ${g.application_url ? `<a href="${g.application_url}" style="color:#EF4444;font-size:12px;font-weight:600;text-decoration:none;">Apply now →</a>` : ''}
        </div>`).join('')

      await resend.emails.send({
        from: 'FundsRadar <hello@fundsradar.co>',
        reply_to: 'hello@fundsradar.co',
        to: profile.email,
        subject: `🔴 ${grants.length} grant${grants.length > 1 ? 's' : ''} closing in 7 days — act now`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#EF4444;padding:28px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px;">⏰ Deadline alert</p>
    <h1 style="color:white;font-size:24px;margin:0;font-weight:700;">7 days left to apply</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin-bottom:24px;">
      The following matched grant${grants.length > 1 ? 's' : ''} close in <strong>7 days</strong>. Don't miss out:
    </p>
    ${grantList}
    <div style="text-align:center;margin:28px 0 0;">
      <a href="${appUrl}/dashboard" style="background:#0F4C35;color:white;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        View my dashboard →
      </a>
    </div>
  </div>
  <div style="background:#F9FAFB;padding:16px 32px;text-align:center;">
    <p style="color:#9CA3AF;font-size:11px;margin:0;">FundsRadar · <a href="mailto:hello@fundsradar.co" style="color:#9CA3AF;">hello@fundsradar.co</a></p>
  </div>
</div>
</body>
</html>`,
      })
      sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Deadline alert error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
