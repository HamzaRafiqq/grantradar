import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Users — Admin' }

function PlanBadge({ plan }: { plan: string | null }) {
  if (plan === 'pro' || plan === 'agency') {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{plan}</span>
  }
  if (plan === 'starter') {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">starter</span>
  }
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">free</span>
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const { q, plan } = await searchParams

  let query = supabase
    .from('profiles')
    .select('id, email, plan, created_at, stripe_customer_id, organisations(name, charity_number, country)')
    .order('created_at', { ascending: false })

  if (plan && plan !== 'all') {
    query = query.eq('plan', plan)
  }

  if (q) {
    query = query.ilike('email', `%${q}%`)
  }

  const { data: profiles } = await query.limit(200)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{profiles?.length ?? 0} results</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]"
        />
        <select
          name="plan"
          defaultValue={plan ?? 'all'}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20"
        >
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
        <button type="submit" className="bg-[#0F4C35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3826] transition-colors">
          Filter
        </button>
        <Link href="/admin/users" className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Reset
        </Link>
      </form>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charity</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charity No.</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed Up</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No users found</td></tr>
              )}
              {(profiles ?? []).map((profile) => {
                const org = Array.isArray(profile.organisations) ? profile.organisations[0] : profile.organisations
                const orgData = org as { name?: string; charity_number?: string; country?: string } | null
                return (
                  <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[160px]">{orgData?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 truncate max-w-[200px]">{profile.email}</td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{orgData?.charity_number ?? '—'}</td>
                    <td className="px-5 py-3"><PlanBadge plan={profile.plan} /></td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/users/${profile.id}`}
                        className="text-[#0F4C35] hover:underline text-xs font-medium mr-3"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
