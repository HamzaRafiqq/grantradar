import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, count } = await req.json()

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!profile?.email) return NextResponse.json({ ok: true })

    const firstName = profile.full_name?.split(' ')[0] ?? 'there'

    await resend.emails.send({
      from: 'GrantRadar <hello@grantredar.co.uk>',
      to: profile.email,
      subject: `Your grants are ready — we found ${count} matches`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #F4F6F5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="background: #0F4C35; padding: 32px; text-align: center;">
      <h1 style="color: #00C875; font-size: 48px; margin: 0;">${count}</h1>
      <p style="color: white; font-size: 16px; margin: 8px 0 0;">grants matched to your charity</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #0D1117; font-size: 16px;">Hi ${firstName},</p>
      <p style="color: #4B5563; font-size: 15px; line-height: 1.6;">
        Great news — our AI has found <strong>${count} grants</strong> that match your charity's profile. Each one has been scored for eligibility with a specific reason why it's right for you.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #0F4C35; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View my grants →
        </a>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Grants ready email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
