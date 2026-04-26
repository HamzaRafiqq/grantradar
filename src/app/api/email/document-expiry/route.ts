import { NextResponse } from 'next/server'
import { Resend } from 'resend'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

const resend = new Resend(process.env.RESEND_API_KEY)

const TIERS = [
  { days: 60, label: '60 days',  urgency: 'heads-up',  color: '#0F4C35' },
  { days: 30, label: '30 days',  urgency: 'reminder',  color: '#F59E0B' },
  { days: 7,  label: '7 days',   urgency: 'urgent',    color: '#EF4444' },
]

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let totalSent = 0
  const errors: string[] = []

  for (const tier of TIERS) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + tier.days)
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

    // Find documents expiring on this exact date
    const { data: docs, error } = await supabase
      .from('documents')
      .select(`
        id, name, category, expiry_date,
        org:organisations(id, name),
        uploader:profiles(id, email, full_name)
      `)
      .eq('expiry_date', dateStr)

    if (error) {
      errors.push(`Tier ${tier.days}d: ${error.message}`)
      continue
    }

    if (!docs?.length) continue

    // Group by user so one email per user covers all their expiring docs
    const byUser: Record<string, { email: string; name: string; docs: any[] }> = {}
    for (const doc of docs as any[]) {
      const uid = doc.uploader?.id
      if (!uid || !doc.uploader?.email) continue
      if (!byUser[uid]) {
        byUser[uid] = {
          email: doc.uploader.email,
          name: doc.uploader.full_name ?? 'there',
          docs: [],
        }
      }
      byUser[uid].docs.push(doc)
    }

    for (const { email, name, docs: userDocs } of Object.values(byUser)) {
      const docRows = userDocs.map((d: any) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
            <strong style="color:#0D1117;">${d.name}</strong>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;">
            ${d.category}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:${tier.color};font-weight:600;">
            ${tier.label}
          </td>
        </tr>
      `).join('')

      const subject =
        tier.days === 7
          ? `⚠️ ${userDocs.length} document${userDocs.length > 1 ? 's' : ''} expiring in 7 days`
          : tier.days === 30
          ? `📋 Document reminder: ${userDocs.length} expiring in 30 days`
          : `📂 Document heads-up: ${userDocs.length} expiring in 60 days`

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F6F5;margin:0;padding:0;">
          <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <!-- Header -->
            <div style="background:${tier.color};padding:28px 32px;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
                  <span style="color:white;font-size:14px;">📂</span>
                </div>
                <span style="color:white;font-weight:700;font-size:16px;">FundsRadar</span>
              </div>
              <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">
                Document Expiry ${tier.urgency === 'urgent' ? 'Alert' : 'Reminder'}
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">
                Hi ${name} — ${userDocs.length} document${userDocs.length > 1 ? 's' : ''} in your vault will expire in <strong>${tier.label}</strong>.
              </p>
            </div>

            <!-- Body -->
            <div style="padding:28px 32px;">
              <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Document</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Category</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Expires in</th>
                  </tr>
                </thead>
                <tbody>${docRows}</tbody>
              </table>

              <div style="margin-top:24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'}/documents"
                   style="display:inline-block;background:#0F4C35;color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">
                  Update documents →
                </a>
              </div>

              <p style="margin-top:24px;font-size:13px;color:#9ca3af;line-height:1.6;">
                Keeping your documents up to date improves your Trust Score and helps funders see you're grant-ready.
              </p>
            </div>

            <!-- Footer -->
            <div style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                You're receiving this because you have documents stored in FundsRadar.
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'}/settings" style="color:#0F4C35;text-decoration:none;">Manage preferences</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `

      try {
        await resend.emails.send({
          from: 'FundsRadar <reminders@fundsradar.co>',
          to: email,
          subject,
          html,
        })
        totalSent++
      } catch (e: any) {
        errors.push(`Email to ${email}: ${e.message}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    errors: errors.length ? errors : undefined,
  })
}
