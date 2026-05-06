import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]
  const results: Record<string, unknown> = {}

  // 1. Mark expired opportunity grants as inactive
  const { count: expired } = await supabase
    .from('grants')
    .update({ is_active: false })
    .eq('grant_type', 'opportunity')
    .lt('deadline', today)
    .eq('is_active', true)
    .select('*')
  results.expired = expired ?? 0

  // 2. Count active opportunities
  const { count: activeOpps } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('grant_type', 'opportunity')
    .eq('is_active', true)
  results.active_opportunities = activeOpps ?? 0

  // 3. Count awarded (360Giving) grants
  const { count: awarded } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('grant_type', 'awarded')
  results.awarded_historical = awarded ?? 0

  // 4. Email admin summary
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'FundsRadar <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL,
        subject: `FundsRadar Nightly Cleanup — ${today}`,
        html: `<p>Nightly grant cleanup complete:</p>
          <ul>
            <li>Expired grants marked inactive: ${results.expired}</li>
            <li>Active open opportunities: ${results.active_opportunities}</li>
            <li>Historical awarded grants (360Giving): ${results.awarded_historical}</li>
          </ul>`,
      })
    } catch { /* email failure is non-fatal */ }
  }

  return NextResponse.json({ ok: true, ...results })
}
