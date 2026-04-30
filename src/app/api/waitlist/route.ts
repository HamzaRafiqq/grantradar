import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { first_name, email, organisation } = await req.json() as {
      first_name: string
      email: string
      organisation?: string
    }

    if (!first_name?.trim() || !email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'First name and valid email are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: dbError } = await supabase
      .from('waitlist')
      .upsert(
        {
          first_name: first_name.trim(),
          email: email.trim().toLowerCase(),
          organisation: organisation?.trim() || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (dbError) {
      console.error('Waitlist DB error:', dbError)
      return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
    }

    // Send confirmation email via Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: 'FundsRadar <hello@fundsradar.co>',
        to: email.trim().toLowerCase(),
        subject: "You're on the FundsRadar waitlist 🎯",
        html: `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0F4C35;margin:0;padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background:#0a3d29;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
  <div style="padding:40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:700;color:white;">FundsRadar</span>
    </div>
    <div style="background:rgba(0,200,117,0.15);border:1px solid rgba(0,200,117,0.3);border-radius:100px;display:inline-block;padding:6px 16px;margin-bottom:20px;">
      <span style="color:#00C875;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">You&apos;re on the list ✓</span>
    </div>
    <h1 style="color:white;font-size:28px;margin:0 0 8px;font-weight:700;">Hi ${first_name}! 👋</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0;">Welcome to the FundsRadar founding community.</p>
  </div>
  <div style="padding:32px;">
    <p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.7;margin:0 0 24px;">
      You&apos;re on the waitlist! We launch on <strong style="color:white;">June 27th 2026</strong> and as a founding member, you&apos;ll get <strong style="color:#00C875;">3 months completely free</strong>.
    </p>
    <div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">What you&apos;re getting access to:</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.8);font-size:14px;">🎯 AI that matches your charity to grants you qualify for</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.8);font-size:14px;">⭐ Eligibility scores so you know where to focus</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.8);font-size:14px;">✍️ AI-drafted application paragraphs</p>
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">📋 Grant pipeline to track your applications</p>
    </div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;text-align:center;margin:0;">
      Questions? Reply to this email or contact us at <a href="mailto:hello@fundsradar.co" style="color:#00C875;">hello@fundsradar.co</a>
    </p>
  </div>
</div>
</body>
</html>`,
      })
    } catch (emailErr) {
      console.error('Confirmation email failed:', emailErr)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Waitlist route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
