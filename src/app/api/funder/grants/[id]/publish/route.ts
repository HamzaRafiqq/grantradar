import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  // Verify ownership & fetch grant
  const { data: grant } = await supabase
    .from('funder_grants')
    .select('*, funder:funder_profiles(org_name)')
    .eq('id', id)
    .eq('funder_id', user.id)
    .single()

  if (!grant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!grant.deadline) return NextResponse.json({ error: 'Deadline is required before publishing' }, { status: 400 })

  // Mark as open
  const { error } = await supabase
    .from('funder_grants')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Basic matching: find charities whose sector matches cause_areas
  // and email them about the new grant
  if (grant.cause_areas?.length > 0) {
    const { data: matchedOrgs } = await supabase
      .from('organisations')
      .select('user_id, name')
      .overlaps('sector', grant.cause_areas)
      .limit(200)

    if (matchedOrgs && matchedOrgs.length > 0) {
      // Get emails for matched users
      const userIds = matchedOrgs.map((o: { user_id: string }) => o.user_id).filter(Boolean)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      // Send alert emails (batch, max 10 to avoid rate limits in dev)
      const toAlert = (profilesData ?? []).slice(0, 10)
      const funderName = (grant.funder as { org_name: string })?.org_name ?? 'A funder'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

      await Promise.allSettled(
        toAlert.map((p: { email: string }) =>
          resend.emails.send({
            from: 'FundsRadar <alerts@fundsradar.co>',
            to: p.email,
            subject: `💰 New grant: ${grant.title}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
                <h2 style="color:#0D1117;">New grant matching your focus areas</h2>
                <p style="color:#374151;"><strong>${funderName}</strong> has published a new grant on FundsRadar.</p>
                <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;">
                  <p style="font-weight:700;font-size:18px;color:#0D1117;margin:0 0 8px;">${grant.title}</p>
                  ${grant.max_grant ? `<p style="color:#0F4C35;font-weight:600;margin:0 0 4px;">Up to £${grant.max_grant.toLocaleString()}</p>` : ''}
                  ${grant.deadline ? `<p style="color:#6b7280;font-size:14px;margin:0;">Deadline: ${new Date(grant.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
                </div>
                <a href="${appUrl}/dashboard" style="display:inline-block;background:#0F4C35;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">
                  View grant →
                </a>
              </div>
            `,
          }),
        ),
      )
    }
  }

  return NextResponse.json({ ok: true, status: 'open' })
}
