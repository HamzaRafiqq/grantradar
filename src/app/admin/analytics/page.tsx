import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignupsBarChart, PlanPieChart } from './SignupsChart'

export const metadata = { title: 'Analytics — Admin' }

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // Signups per day for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: rawProfiles },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('plan, created_at'),
  ])

  // Group signups by date
  const signupsByDate: Record<string, number> = {}
  // Pre-fill all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    signupsByDate[key] = 0
  }
  for (const p of rawProfiles ?? []) {
    const key = new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    if (key in signupsByDate) signupsByDate[key]++
  }
  const signupsData = Object.entries(signupsByDate).map(([date, count]) => ({ date, count }))

  // Plan distribution
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0 }
  for (const p of allProfiles ?? []) {
    const plan = p.plan ?? 'free'
    planCounts[plan] = (planCounts[plan] ?? 0) + 1
  }
  const planData = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }))

  // Week comparisons
  const now = new Date()
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7)
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14)

  const thisWeekSignups = (allProfiles ?? []).filter(p => new Date(p.created_at) >= thisWeekStart).length
  const lastWeekSignups = (allProfiles ?? []).filter(p => new Date(p.created_at) >= lastWeekStart && new Date(p.created_at) < thisWeekStart).length
  const totalUsers = allProfiles?.length ?? 0

  function delta(now: number, prev: number) {
    if (prev === 0) return now > 0 ? '+∞' : '—'
    const d = now - prev
    return (d >= 0 ? '+' : '') + d
  }

  const metrics = [
    { label: 'New Signups', thisWeek: thisWeekSignups, lastWeek: lastWeekSignups },
    { label: 'Total Users', thisWeek: totalUsers, lastWeek: totalUsers },
    { label: 'Paying Users', thisWeek: (allProfiles ?? []).filter(p => p.plan && p.plan !== 'free').length, lastWeek: 0 },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Platform usage and growth metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Signups chart */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Signups — Last 30 Days</h2>
          <SignupsBarChart data={signupsData} />
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Plan Distribution</h2>
          <PlanPieChart data={planData} />
        </div>
      </div>

      {/* Week comparison */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">This Week vs Last Week</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">This Week</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Week</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.label} className="border-b border-gray-100">
                <td className="px-6 py-3 font-medium text-gray-900">{m.label}</td>
                <td className="px-6 py-3 text-gray-700">{m.thisWeek}</td>
                <td className="px-6 py-3 text-gray-400">{m.lastWeek}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-semibold ${m.thisWeek >= m.lastWeek ? 'text-green-600' : 'text-red-500'}`}>
                    {delta(m.thisWeek, m.lastWeek)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
