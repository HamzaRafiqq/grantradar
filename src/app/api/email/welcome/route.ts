import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

    await resend.emails.send({
      from: 'FundsRadar <hello@grantredar.co.uk>',
      to: user.email!,
      subject: 'Welcome to FundsRadar — let\'s find your grants',
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: 'Instrument Sans', sans-serif; background: #F4F6F5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="background: #0F4C35; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; margin: 0; font-family: Georgia, serif;">Welcome to FundsRadar</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #0D1117; font-size: 16px;">Hi ${firstName},</p>
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">
        You've just joined hundreds of UK charity fundraisers who use FundsRadar to find funding they'd otherwise miss.
      </p>
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">
        Complete your organisation profile and our AI will scan 380+ active UK grants to find the ones you're eligible for — usually in under 20 seconds.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="background: #0F4C35; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Complete my profile →
        </a>
      </div>
      <p style="color: #9CA3AF; font-size: 13px; text-align: center;">
        FundsRadar · Made for UK charity fundraisers
      </p>
    </div>
  </div>
</body>
</html>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
