import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FunderShell from '../FunderShell'

export const metadata: Metadata = {
  title: 'My Grants — FundsRadar Funder Portal',
  robots: { index: false, follow: false },
}

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  open:     'bg-green-100 text-green-700',
  closed:   'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-400',
}

export default async function FunderGrantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: funder } = await supabase
    .from('funder_profiles').select('org_name').eq('id', user.id).maybeSingle()
  if (!funder) redirect('/funder/onboarding')

  const { data: grants } = await supabase
    .from('funder_grants')
    .select(`
      id, title, status, total_pot, max_grant, deadline, created_at,
      applications:funder_applications(count)
    `)
    .eq('funder_id', user.id)
    .order('created_at', { ascending: false })

  const grantList = (grants ?? []) as Array<{
    id: string; title: string; status: string; total_pot: number | null;
    max_grant: number | null; deadline: string | null; created_at: string;
    applications: { count: number }[]
  }>

  return (
    <FunderShell orgName={funder.org_name}>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-[#0D1117] text-2xl">My Grants</h1>
            <p className="text-gray-500 text-sm mt-1">{grantList.length} grant{grantList.length !== 1 ? 's' : ''} posted</p>
          </div>
          <Link
            href="/funder/grants/create"
            className="flex items-center gap-2 bg-[#0F2B4C] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#0a1f38] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Post a grant
          </Link>
        </div>

        {grantList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="font-display font-bold text-[#0D1117] text-lg mb-2">No grants yet</h2>
            <p className="text-gray-400 text-sm mb-6">Post your first grant and start receiving applications from matched charities.</p>
            <Link
              href="/funder/grants/create"
              className="inline-flex items-center gap-2 bg-[#0F2B4C] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#0a1f38] transition-colors"
            >
              Post your first grant →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Pot size</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Applications</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Deadline</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grantList.map(grant => {
                  const appCount = grant.applications?.[0]?.count ?? 0
                  return (
                    <tr key={grant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#0D1117] truncate max-w-[200px]">{grant.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Created {new Date(grant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell text-gray-700">
                        {grant.total_pot ? `£${grant.total_pot.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="font-semibold text-[#0F2B4C]">{appCount}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell text-gray-600">
                        {grant.deadline
                          ? new Date(grant.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_COLORS[grant.status]}`}>
                          {grant.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/funder/applications?grant_id=${grant.id}`}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Applications
                          </Link>
                          <Link
                            href={`/funder/grants/${grant.id}`}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FunderShell>
  )
}
