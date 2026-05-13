import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: org } = await supabase.from('organisations').select('country').eq('user_id', user.id).single()
    const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

    await resend.emails.send({
      from: 'FundsRadar <hello@fundsradar.co>',
      to: user.email!,
      subject: "Welcome to FundsRadar — let's find your grants",
      html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#0F4C35;padding:32px;text-align:center;">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#00C875;font-size:20px;">◎</span>
      </div>
      <span style="color:white;font-size:20px;font-weight:700;">FundsRadar</span>
    </div>
    <h1 style="color:white;font-size:26px;margin:0;font-weight:700;">Welcome, ${firstName}! 🎉</h1>
  </div>
  <div style="padding:32px;">
    <p style="color:#0D1117;font-size:15px;line-height:1.6;">You've just joined UK charities using FundsRadar to find funding they'd otherwise miss.</p>
    <p style="color:#4B5563;font-size:15px;line-height:1.6;">Our AI is ready to scan hundreds of active grants and match the best opportunities to your organisation — usually in under 30 seconds.</p>
    <div style="background:#F4F6F5;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 12px;font-weight:600;color:#0D1117;font-size:14px;">Here's what happens next:</p>
      <div style="display:flex;gap:12px;margin-bottom:10px;">
        <span style="color:#00C875;font-weight:700;">1.</span>
        <span style="color:#4B5563;font-size:14px;">Complete your organisation profile</span>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:10px;">
        <span style="color:#00C875;font-weight:700;">2.</span>
        <span style="color:#4B5563;font-size:14px;">AI scans hundreds of grants and scores your eligibility</span>
      </div>
      <div style="display:flex;gap:12px;">
        <span style="color:#00C875;font-weight:700;">3.</span>
        <span style="color:#4B5563;font-size:14px;">You get up to 50 matched grants with reasons why you qualify</span>
      </div>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/onboarding" style="background:#0F4C35;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Find my grants →
      </a>
    </div>
    <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
      FundsRadar · <a href="mailto:hello@fundsradar.co" style="color:#9CA3AF;">hello@fundsradar.co</a>
      ${org?.country ? ` · ${org.country}` : ''}
    </p>
  </div>
</div>
</body>
</html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
