import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FunderShell from '../FunderShell'

export const metadata: Metadata = {
  title: 'Applications — FundsRadar Funder Portal',
  robots: { index: false, follow: false },
}

const STATUS_OPTIONS = [
  { value: '',             label: 'All statuses' },
  { value: 'received',     label: 'Received' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted',  label: 'Shortlisted' },
  { value: 'awarded',      label: 'Awarded' },
  { value: 'declined',     label: 'Declined' },
  { value: 'waitlisted',   label: 'Waitlisted' },
]

const STATUS_COLORS: Record<string, string> = {
  received:     'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  shortlisted:  'bg-purple-50 text-purple-700',
  awarded:      'bg-green-50 text-green-700',
  declined:     'bg-red-50 text-red-600',
  waitlisted:   'bg-gray-50 text-gray-600',
}

function trustScoreColor(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export default async function FunderApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ grant_id?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: funder } = await supabase
    .from('funder_profiles').select('org_name').eq('id', user.id).maybeSingle()
  if (!funder) redirect('/funder/onboarding')

  const sp = await searchParams
  const filterGrantId = sp.grant_id
  const filterStatus  = sp.status

  let query = supabase
    .from('funder_applications')
    .select(`
      id, status, amount_requested, submitted_at,
      grant:funder_grants!inner(id, title, funder_id),
      org:organisations(id, name, charity_number, trust_score, location)
    `)
    .eq('funder_grants.funder_id', user.id)
    .order('submitted_at', { ascending: false })

  if (filterGrantId) query = query.eq('grant_id', filterGrantId)
  if (filterStatus)  query = query.eq('status', filterStatus)

  const { data: apps } = await query

  // Fetch grants for the filter dropdown
  const { data: grants } = await supabase
    .from('funder_grants')
    .select('id, title')
    .eq('funder_id', user.id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appList = (apps ?? []) as any[] as Array<{
    id: string; status: string; amount_requested: number | null; submitted_at: string;
    grant: { id: string; title: string }; org: { id: string; name: string; charity_number?: string; trust_score: number; location?: string }
  }>

  return (
    <FunderShell orgName={funder.org_name}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-[#0D1117] text-xl sm:text-2xl">Applications</h1>
            <p className="text-gray-500 text-sm mt-1">{appList.length} application{appList.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <form className="flex gap-3 flex-wrap">
            <select
              name="grant_id"
              defaultValue={filterGrantId ?? ''}
              onChange={e => {
                const url = new URL(window.location.href)
                if (e.target.value) url.searchParams.set('grant_id', e.target.value)
                else url.searchParams.delete('grant_id')
                window.location.href = url.toString()
              }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20"
            >
              <option value="">All grants</option>
              {(grants ?? []).map((g: { id: string; title: string }) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={filterStatus ?? ''}
              onChange={e => {
                const url = new URL(window.location.href)
                if (e.target.value) url.searchParams.set('status', e.target.value)
                else url.searchParams.delete('status')
                window.location.href = url.toString()
              }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20"
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </form>
        </div>

        {appList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📨</div>
            <h2 className="font-display font-bold text-[#0D1117] text-lg mb-2">No applications yet</h2>
            <p className="text-gray-400 text-sm">
              {filterGrantId || filterStatus ? 'No applications match your filters.' : 'Publish a grant to start receiving applications.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Charity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Grant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Trust Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Requested</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appList.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#0D1117]">{app.org?.name}</p>
                      {app.org?.charity_number && (
                        <p className="text-xs text-gray-400 mt-0.5">Reg. {app.org.charity_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell text-gray-600 max-w-[160px]">
                      <span className="truncate block">{app.grant?.title}</span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {app.org?.trust_score > 0 ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trustScoreColor(app.org.trust_score)}`}>
                          {app.org.trust_score}/100
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-gray-700">
                      {app.amount_requested ? `£${app.amount_requested.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-gray-500 text-xs">
                      {new Date(app.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[app.status] ?? 'bg-gray-50 text-gray-500'}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/funder/applications/${app.id}`}
                        className="text-xs font-semibold text-[#0F2B4C] hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FunderShell>
  )
}
