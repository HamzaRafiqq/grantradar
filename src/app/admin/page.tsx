import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Admin — FundsRadar' }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (plan === 'pro' || plan === 'agency') {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{plan}</span>
  }
  if (plan === 'starter') {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">starter</span>
  }
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">free</span>
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // Fetch stats in parallel
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalUsers },
    { data: planData },
    { count: todaySignups },
    { count: totalCharities },
    { count: totalGrants },
    { data: recentProfiles },
    { data: recentPipeline },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('plan'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('organisations').select('*', { count: 'exact', head: true }),
    supabase.from('grants').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, email, plan, created_at, organisations(name, charity_number)').order('created_at', { ascending: false }).limit(10),
    supabase.from('pipeline_items').select('id, stage, created_at, grant:grants(name, funder), profile:profiles(email)').order('created_at', { ascending: false }).limit(10),
  ])

  // Calculate MRR
  const planPrices: Record<string, number> = { starter: 9, pro: 49, agency: 99 }
  const mrr = (planData ?? []).reduce((sum, p) => {
    return sum + (planPrices[p.plan ?? ''] ?? 0)
  }, 0)

  const payingUsers = (planData ?? []).filter(p => p.plan && p.plan !== 'free').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500 text-sm mt-1">FundsRadar platform dashboard</p>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Users" value={totalUsers ?? 0} />
        <StatCard label="Paying Users" value={payingUsers} />
        <StatCard label="Today's Signups" value={todaySignups ?? 0} />
        <StatCard label="MRR" value={`£${mrr.toLocaleString()}`} sub="Estimated monthly revenue" />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Charities" value={totalCharities ?? 0} />
        <StatCard label="Grants in DB" value={totalGrants ?? 0} />
        <StatCard label="Conversion Rate" value={totalUsers ? `${Math.round((payingUsers / totalUsers) * 100)}%` : '0%'} sub="Free → Paid" />
        <StatCard label="ARPU" value={payingUsers ? `£${Math.round(mrr / payingUsers)}` : '£0'} sub="Per paying user" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Signups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {(recentProfiles ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No signups yet</td></tr>
                )}
                {(recentProfiles ?? []).map((p) => {
                  const org = Array.isArray(p.organisations) ? p.organisations[0] : p.organisations
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700 truncate max-w-[160px]">{p.email}</td>
                      <td className="px-5 py-3 text-gray-500 truncate max-w-[120px]">{(org as { name?: string } | null)?.name ?? '—'}</td>
                      <td className="px-5 py-3"><PlanBadge plan={p.plan} /></td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Pipeline Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {(recentPipeline ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No activity yet</td></tr>
                )}
                {(recentPipeline ?? []).map((item) => {
                  const grant = item.grant as { name?: string; funder?: string } | null
                  const profile = item.profile as { email?: string } | null
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 truncate max-w-[140px]">{profile?.email ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-700 truncate max-w-[140px]">{grant?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{item.stage}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
