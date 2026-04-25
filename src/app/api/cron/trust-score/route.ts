import { NextRequest, NextResponse } from 'next/server'

// Weekly cron: recalculates trust scores for all orgs + sends improvement email
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return runTrustScoreCron()
}

async function runTrustScoreCron() {
  try {
    const { Resend } = await import('resend')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')
    const { calculateTrustScore, trustScoreColor, CATEGORY_LABELS } = await import('@/lib/trust-score')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

    // All orgs
    const { data: orgs } = await supabase
      .from('organisations')
      .select('id, user_id, name, trust_score')

    if (!orgs?.length) return NextResponse.json({ ok: true, processed: 0 })

    const orgUserIds = orgs.map((o: { user_id: string }) => o.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, plan')
      .in('id', orgUserIds)

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: { id: string }) => [p.id, p])
    )

    let processed = 0

    for (const org of orgs) {
      try {
        const result = await calculateTrustScore(org.id, supabase)
        const profile = profileMap[org.user_id]
        if (!profile?.email) continue

        const firstName = profile.full_name?.split(' ')[0] ?? 'there'
        const delta = result.previous != null ? result.total - result.previous : null
        const deltaStr = delta != null && delta !== 0
          ? `<span style="color:${delta > 0 ? '#16A34A' : '#DC2626'};font-weight:700;">${delta > 0 ? '+' : ''}${delta} pts</span>`
          : ''
        const { ring } = trustScoreColor(result.total)

        // Category bars HTML
        const categoryBars = (Object.keys(result.scores) as (keyof typeof result.scores)[]).map(key => {
          const val = result.scores[key]
          const pct = val * 5 // max 20 → 100%
          return `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:12px;color:#4B5563;">${CATEGORY_LABELS[key]}</span>
              <span style="font-size:12px;font-weight:600;color:#0D1117;">${val}/20</span>
            </div>
            <div style="height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;">
              <div style="height:6px;width:${pct}%;background:${ring};border-radius:3px;"></div>
            </div>
          </div>`
        }).join('')

        const improvements = result.improvements.map(tip =>
          `<li style="margin-bottom:8px;color:#4B5563;font-size:13px;line-height:1.5;">↑ ${tip}</li>`
        ).join('')

        await resend.emails.send({
          from: 'FundsRadar <hello@fundsradar.co>',
          reply_to: 'hello@fundsradar.co',
          to: profile.email,
          subject: `Your FundsRadar Trust Score this week — ${result.total}/100`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#0F4C35;padding:28px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 6px;">Weekly trust score update</p>
    <h1 style="color:white;font-size:28px;margin:0 0 4px;font-weight:800;">${result.total}/100 ${deltaStr}</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0;">${org.name}</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;margin-bottom:4px;">Hi ${firstName},</p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin-bottom:24px;">
      ${delta != null && delta > 0
        ? `Great news — your Trust Score went up by ${delta} points this week! Funders can see this score on your profile.`
        : `Here's your weekly Trust Score snapshot. Funders can see this score on your profile.`
      }
    </p>

    <div style="margin-bottom:24px;">
      ${categoryBars}
    </div>

    ${result.improvements.length > 0 ? `
    <div style="background:#F4F6F5;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="font-weight:700;color:#0D1117;font-size:14px;margin:0 0 10px;">Top actions to improve your score</p>
      <ul style="margin:0;padding-left:0;list-style:none;">
        ${improvements}
      </ul>
    </div>` : ''}

    <div style="text-align:center;">
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

        processed++
      } catch (orgErr) {
        console.error(`Trust score failed for org ${org.id}:`, orgErr)
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (err) {
    console.error('Trust score cron error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
