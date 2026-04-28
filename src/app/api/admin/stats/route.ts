import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalUsers },
    { data: planData },
    { count: todaySignups },
    { count: totalCharities },
    { count: totalGrants },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('plan'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('organisations').select('*', { count: 'exact', head: true }),
    supabase.from('grants').select('*', { count: 'exact', head: true }),
  ])

  const planPrices: Record<string, number> = { starter: 9, pro: 49, agency: 99 }
  const mrr = (planData ?? []).reduce((sum, p) => sum + (planPrices[p.plan ?? ''] ?? 0), 0)
  const payingUsers = (planData ?? []).filter(p => p.plan && p.plan !== 'free').length

  return NextResponse.json({
    totalUsers,
    payingUsers,
    todaySignups,
    mrr,
    totalCharities,
    totalGrants,
  })
}
