import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel cron every Monday at 08:00 UTC
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return sendDigests()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return sendDigests()
}

async function sendDigests() {
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

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const today = now.toISOString().split('T')[0]
    const deadline30 = in30Days.toISOString().split('T')[0]

    // Get all matches with deadlines in the next 30 days
    const { data: matches } = await supabase
      .from('grant_matches')
      .select('user_id, eligibility_score, grant:grants(name, funder, deadline, max_award, application_url)')
      .gte('grant.deadline', today)
      .lte('grant.deadline', deadline30)
      .neq('status', 'lost')

    if (!matches || matches.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    // Group by user
    const byUser: Record<string, Array<{ name: string; funder: string; deadline: string; max_award: number; score: number }>> = {}
    for (const m of matches) {
      if (!m.grant || typeof m.grant !== 'object') continue
      const g = m.grant as { name: string; funder: string; deadline: string; max_award: number }
      if (!byUser[m.user_id]) byUser[m.user_id] = []
      byUser[m.user_id].push({ ...g, score: m.eligibility_score })
    }

    const userIds = Object.keys(byUser)
    if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan')
      .in('id', userIds)

    let sent = 0
    for (const profile of profiles ?? []) {
      const grants = byUser[profile.id] ?? []
      if (!grants.length || !profile.email) continue

      const firstName = profile.full_name?.split(' ')[0] ?? 'there'
      const isPro = profile.plan === 'pro'

      // Sort by deadline soonest
      grants.sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

      const grantRows = grants.slice(0, isPro ? 10 : 3).map(g => {
        const days = Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const urgency = days <= 7 ? '🔴' : days <= 14 ? '🟡' : '🟢'
        return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F3F4F6;">
            <p style="margin:0 0 2px;font-weight:600;color:#0D1117;font-size:13px;">${g.name}</p>
            <p style="margin:0;color:#6B7280;font-size:12px;">${g.funder}</p>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #F3F4F6;text-align:center;white-space:nowrap;">
            <span style="font-size:12px;">${urgency} ${days}d left</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #F3F4F6;text-align:right;">
            <span style="background:#E8F2ED;color:#0F4C35;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">${g.score}/10</span>
          </td>
        </tr>`
      }).join('')

      await resend.emails.send({
        from: 'FundsRadar <hello@fundsradar.co>',
        to: profile.email,
        subject: `⏰ ${grants.length} grant${grants.length > 1 ? 's' : ''} closing this month — don't miss them`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#0F4C35;padding:28px 32px;">
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Weekly digest</p>
    <h1 style="color:white;font-size:22px;margin:0;font-weight:700;">Your grant deadlines this month</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin-bottom:24px;">
      You have <strong>${grants.length} matched grant${grants.length > 1 ? 's' : ''}</strong> closing in the next 30 days. Here's your deadline summary:
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#9CA3AF;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Grant</th>
          <th style="text-align:center;font-size:11px;color:#9CA3AF;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Deadline</th>
          <th style="text-align:right;font-size:11px;color:#9CA3AF;padding-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Match</th>
        </tr>
      </thead>
      <tbody>${grantRows}</tbody>
    </table>
    ${!isPro && grants.length > 3 ? `
    <div style="background:#F4F6F5;border-radius:12px;padding:16px;margin-top:20px;text-align:center;">
      <p style="margin:0 0 8px;color:#0D1117;font-size:13px;font-weight:600;">+${grants.length - 3} more grants hidden</p>
      <p style="margin:0 0 12px;color:#6B7280;font-size:12px;">Upgrade to Pro to see all deadline alerts</p>
      <a href="${appUrl}/pricing" style="background:#0F4C35;color:white;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;display:inline-block;">Upgrade to Pro</a>
    </div>` : ''}
    <div style="text-align:center;margin:28px 0 0;">
      <a href="${appUrl}/dashboard" style="background:#0F4C35;color:white;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        View my dashboard →
      </a>
    </div>
  </div>
  <div style="background:#F9FAFB;padding:16px 32px;text-align:center;">
    <p style="color:#9CA3AF;font-size:11px;margin:0;">
      FundsRadar · <a href="mailto:hello@fundsradar.co" style="color:#9CA3AF;">hello@fundsradar.co</a>
      · <a href="${appUrl}/settings" style="color:#9CA3AF;">Manage email preferences</a>
    </p>
  </div>
</div>
</body>
</html>`,
      })
      sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Digest error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
