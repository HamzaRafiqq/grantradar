import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { segment, subject, body } = await req.json()

  if (!subject || !body) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  // Get target users
  let query = supabase.from('profiles').select('email, plan')
  if (segment === 'test') {
    query = supabase.from('profiles').select('email, plan').eq('email', process.env.ADMIN_EMAIL!)
  } else if (segment === 'free') {
    query = supabase.from('profiles').select('email, plan').or('plan.is.null,plan.eq.free')
  } else if (segment === 'paid') {
    query = supabase.from('profiles').select('email, plan').not('plan', 'in', '("free")')
  } else if (segment === 'pro') {
    query = supabase.from('profiles').select('email, plan').eq('plan', 'pro')
  }
  // else 'all' — no filter

  const { data: users, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const emails = (users ?? []).map(u => u.email).filter(Boolean)

  if (emails.length === 0) {
    return NextResponse.json({ message: 'No users in this segment', count: 0 })
  }

  // Use Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      // Send in batches to avoid rate limits
      let sent = 0
      for (const email of emails) {
        await resend.emails.send({
          from: 'FundsRadar <hello@fundsradar.co>',
          to: email,
          subject,
          text: body,
        })
        sent++
      }
      return NextResponse.json({ message: `Sent ${sent} emails successfully`, count: sent })
    } catch (err) {
      return NextResponse.json({ error: `Email send failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 })
    }
  }

  // Fallback — no email provider configured
  return NextResponse.json({
    message: `Would send to ${emails.length} users (Resend not configured)`,
    count: emails.length,
    emails: segment === 'test' ? emails : undefined,
  })
}
