import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { Resend } = await import('resend')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { userId, count } = await req.json()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!profile?.email) return NextResponse.json({ ok: true })

    const { data: org } = await supabase.from('organisations').select('name,country').eq('user_id', userId).single()
    const firstName = profile.full_name?.split(' ')[0] ?? 'there'

    // Get top 3 matches to preview in the email
    const { data: topMatches } = await supabase
      .from('grant_matches')
      .select('eligibility_score, match_reason, grant:grants(name, funder, max_award, deadline)')
      .eq('user_id', userId)
      .order('eligibility_score', { ascending: false })
      .limit(3)

    const previewRows = (topMatches ?? []).map((m: {
      eligibility_score: number
      grant: { name: string; funder: string; max_award: number; deadline: string }
    }) => `
      <div style="border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <p style="margin:0;font-weight:600;color:#0D1117;font-size:14px;">${m.grant?.name ?? 'Grant'}</p>
          <span style="background:#E8F2ED;color:#0F4C35;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;margin-left:8px;">${m.eligibility_score}/10</span>
        </div>
        <p style="margin:0 0 4px;color:#6B7280;font-size:12px;">${m.grant?.funder ?? ''}</p>
        ${m.grant?.max_award ? `<p style="margin:0;color:#0F4C35;font-size:12px;font-weight:600;">Up to ${m.grant.max_award.toLocaleString()}</p>` : ''}
      </div>`
    ).join('')

    await resend.emails.send({
      from: 'FundsRadar <hello@fundsradar.co>',
      to: profile.email,
      subject: `🎯 We found ${count} grants matched to ${org?.name ?? 'your organisation'}`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#0F4C35;padding:32px;text-align:center;">
    <p style="color:#00C875;font-size:56px;font-weight:700;margin:0;line-height:1;">${count}</p>
    <p style="color:white;font-size:16px;margin:8px 0 0;">grants matched to your organisation</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#4B5563;font-size:15px;line-height:1.6;">
      Great news — our AI has found <strong>${count} grants</strong> that match ${org?.name ?? 'your organisation'}. Each one has been scored for eligibility with an explanation of exactly why you qualify.
    </p>
    ${previewRows ? `<p style="color:#0D1117;font-weight:600;font-size:14px;margin:24px 0 12px;">Your top matches:</p>${previewRows}` : ''}
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/dashboard" style="background:#0F4C35;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        View all ${count} grants →
      </a>
    </div>
    <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
      FundsRadar · <a href="mailto:hello@fundsradar.co" style="color:#9CA3AF;">hello@fundsradar.co</a>
    </p>
  </div>
</div>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Grants ready email error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
