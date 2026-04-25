import { NextRequest, NextResponse } from 'next/server'

// Cron: runs daily at 09:00 — sends 30d / 7d / 1d / day-of deadline reminders
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return sendReminders()
}

type ReminderTier = { days: number; subject: string; heading: string; color: string; urgencyText: string }

const TIERS: ReminderTier[] = [
  {
    days: 30,
    subject: '📅 Grant deadline in 30 days — time to prepare',
    heading: '30 days to deadline',
    color: '#0F4C35',
    urgencyText: 'You have a month to prepare your application.',
  },
  {
    days: 7,
    subject: '⚠️ URGENT: Grant deadline in 7 days',
    heading: '7 days left to apply',
    color: '#F59E0B',
    urgencyText: 'This deadline is approaching fast — don\'t miss out.',
  },
  {
    days: 1,
    subject: '🔴 FINAL REMINDER: Grant closes tomorrow',
    heading: 'Closes tomorrow',
    color: '#EF4444',
    urgencyText: 'This grant closes <strong>tomorrow</strong>. Submit your application today.',
  },
  {
    days: 0,
    subject: '🚨 Today is your grant deadline',
    heading: 'Deadline day',
    color: '#DC2626',
    urgencyText: 'Today is the deadline. Submit your application now if you haven\'t already.',
  },
]

async function sendReminders() {
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
    const today = new Date()
    let totalSent = 0

    for (const tier of TIERS) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + tier.days)
      const targetStr = targetDate.toISOString().split('T')[0]

      // Find all active grant_matches whose grant deadline (or deadline_set override) hits the target
      const { data: matches } = await supabase
        .from('grant_matches')
        .select('user_id, notes, amount_requested, grant:grants(id, name, funder, deadline, max_award, application_url, public_title, funder_type)')
        .not('status', 'in', '("won","lost","submitted")')
        .eq('grant.deadline', targetStr)

      if (!matches?.length) continue

      // Group by user
      const byUser: Record<string, typeof matches> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of matches as any[]) {
        if (!m.grant) continue
        if (!byUser[m.user_id]) byUser[m.user_id] = []
        byUser[m.user_id].push(m)
      }

      const userIds = Object.keys(byUser)
      if (!userIds.length) continue

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, plan')
        .in('id', userIds)

      for (const profile of profiles ?? []) {
        const userMatches = byUser[profile.id] ?? []
        if (!userMatches.length || !profile.email) continue

        const firstName = profile.full_name?.split(' ')[0] ?? 'there'
        const showFunder = ['starter', 'pro', 'agency'].includes(profile.plan ?? 'free')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grantRows = userMatches.map((m: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const g = m.grant as any
          const displayName = showFunder ? g.name : (g.public_title ?? 'A UK Grant')
          const displayFunder = showFunder ? g.funder : (g.funder_type ?? 'UK Funder')
          const amount = m.amount_requested ?? g.max_award ?? 0
          const amountStr = amount > 0 ? `Up to £${amount.toLocaleString()}` : 'Amount TBC'

          return `
          <div style="border-left:3px solid ${tier.color};padding:12px 16px;margin-bottom:12px;background:#FAFAFA;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 2px;font-weight:600;color:#0D1117;font-size:14px;">${displayName}</p>
            <p style="margin:0 0 6px;color:#6B7280;font-size:12px;">${displayFunder} · ${amountStr}</p>
            ${showFunder && g.application_url ? `<a href="${g.application_url}" style="color:${tier.color};font-size:12px;font-weight:600;text-decoration:none;">Apply now →</a>` : `<a href="${appUrl}/pipeline" style="color:${tier.color};font-size:12px;font-weight:600;text-decoration:none;">View in pipeline →</a>`}
          </div>`
        }).join('')

        await resend.emails.send({
          from: 'FundsRadar <hello@fundsradar.co>',
          reply_to: 'hello@fundsradar.co',
          to: profile.email,
          subject: tier.subject,
          html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:${tier.color};padding:28px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 6px;">⏰ Application deadline reminder</p>
    <h1 style="color:white;font-size:24px;margin:0;font-weight:700;">${tier.heading}</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;margin-bottom:8px;">Hi ${firstName},</p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin-bottom:24px;">${tier.urgencyText}</p>
    ${grantRows}
    <div style="text-align:center;margin:28px 0 0;">
      <a href="${appUrl}/pipeline" style="background:${tier.color};color:white;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        Open my pipeline →
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
        totalSent++
      }
    }

    return NextResponse.json({ ok: true, sent: totalSent })
  } catch (err) {
    console.error('Deadline reminders error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
