import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Grants — Admin' }

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const { q, active } = await searchParams

  // Stats
  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [
    { count: totalGrants },
    { count: activeGrants },
    { count: closingThisWeek },
  ] = await Promise.all([
    supabase.from('grants').select('*', { count: 'exact', head: true }),
    supabase.from('grants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('grants').select('*', { count: 'exact', head: true })
      .gte('deadline', today.toISOString())
      .lte('deadline', weekEnd.toISOString()),
  ])

  // List query
  let query = supabase
    .from('grants')
    .select('id, name, funder, min_award, max_award, deadline, is_active, source, country')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`name.ilike.%${q}%,funder.ilike.%${q}%`)
  }
  if (active === 'true') query = query.eq('is_active', true)
  if (active === 'false') query = query.eq('is_active', false)

  const { data: grants } = await query.limit(200)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grants</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the grant database</p>
        </div>
        <Link
          href="/admin/grants/new"
          className="bg-[#0F4C35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3826] transition-colors"
        >
          + New Grant
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Grants</p>
          <p className="text-2xl font-bold text-gray-900">{totalGrants?.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-gray-900">{activeGrants?.toLocaleString() ?? 0}</p>
        </div>
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Closing This Week</p>
          <p className="text-2xl font-bold text-gray-900">{closingThisWeek ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or funder..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]"
        />
        <select
          name="active"
          defaultValue={active ?? 'all'}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20"
        >
          <option value="all">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button type="submit" className="bg-[#0F4C35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3826] transition-colors">
          Filter
        </button>
        <Link href="/admin/grants" className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Reset
        </Link>
      </form>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funder</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Award</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(grants ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No grants found</td></tr>
              )}
              {(grants ?? []).map((grant) => (
                <tr key={grant.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{grant.name}</td>
                  <td className="px-5 py-3 text-gray-500 truncate max-w-[150px]">{grant.funder ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap text-xs">
                    {grant.min_award || grant.max_award ? (
                      <>£{Number(grant.min_award || 0).toLocaleString()} – £{Number(grant.max_award || 0).toLocaleString()}</>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {grant.deadline ? new Date(grant.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Rolling'}
                  </td>
                  <td className="px-5 py-3">
                    {grant.is_active !== false
                      ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                      : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{grant.source ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/grants/${grant.id}`} className="text-[#0F4C35] hover:underline text-xs font-medium">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
