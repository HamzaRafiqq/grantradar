import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('waitlist')
    .upsert({ email, created_at: new Date().toISOString() }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json({ error: 'Could not save email' }, { status: 500 })
  }

  // Send confirmation email
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

    await resend.emails.send({
      from: 'FundsRadar <hello@fundsradar.co>',
      to: email,
      subject: "You're on the FundsRadar waitlist 🎉",
      html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#F4F6F5;margin:0;padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="background:#0F4C35;padding:32px;text-align:center;">
    <h1 style="color:white;font-size:24px;margin:0;font-weight:700;">You're on the list ✓</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0;">We'll notify you the moment FundsRadar opens.</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#4B5563;font-size:14px;line-height:1.6;">
      FundsRadar uses AI to match nonprofits and charities to grants they're eligible for — worldwide. We're putting the finishing touches on the platform and will be opening early access soon.
    </p>
    <div style="background:#F4F6F5;border-radius:12px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 10px;font-weight:600;color:#0D1117;font-size:13px;">What to expect:</p>
      <p style="margin:0 0 6px;color:#4B5563;font-size:13px;">🎯 AI-matched grants scored for your specific organisation</p>
      <p style="margin:0 0 6px;color:#4B5563;font-size:13px;">🌍 Grants from your country + global funders</p>
      <p style="margin:0;color:#4B5563;font-size:13px;">✍️ AI-drafted application paragraphs</p>
    </div>
    <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
      FundsRadar · <a href="mailto:hello@fundsradar.co" style="color:#9CA3AF;">hello@fundsradar.co</a>
    </p>
  </div>
</div>
</body>
</html>`,
    })
  } catch (emailErr) {
    console.error('Waitlist confirmation email failed:', emailErr)
    // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true })
}
