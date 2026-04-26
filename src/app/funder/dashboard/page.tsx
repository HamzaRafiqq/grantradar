import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FunderShell from '../FunderShell'

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  open:     'bg-green-100 text-green-700',
  closed:   'bg-amber-100 text-amber-700',
  archived: 'bg-gray-100 text-gray-400',
}

const APP_STATUS_COLORS: Record<string, string> = {
  received:     'bg-blue-50 text-blue-600',
  under_review: 'bg-amber-50 text-amber-600',
  shortlisted:  'bg-purple-50 text-purple-600',
  awarded:      'bg-green-50 text-green-700',
  declined:     'bg-red-50 text-red-600',
  waitlisted:   'bg-gray-50 text-gray-600',
}

export default async function FunderDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check funder profile exists
  const { data: funder } = await supabase
    .from('funder_profiles').select('*').eq('id', user.id).maybeSingle()
  if (!funder) redirect('/funder/onboarding')

  // Fetch grants
  const { data: grants } = await supabase
    .from('funder_grants')
    .select('id, title, status, max_grant, deadline, created_at')
    .eq('funder_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch applications with stats
  const { data: allApps } = await supabase
    .from('funder_applications')
    .select(`
      id, status, submitted_at,
      grant:funder_grants!inner(title, funder_id),
      org:organisations(name, trust_score)
    `)
    .eq('funder_grants.funder_id', user.id)
    .order('submitted_at', { ascending: false })

  const grantList = grants ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appList   = (allApps ?? []) as any[] as Array<{
    id: string; status: string; submitted_at: string;
    grant: { title: string }; org: { name: string; trust_score: number }
  }>

  const activeGrants    = grantList.filter(g => g.status === 'open').length
  const totalApps       = appList.length
  const pendingDecisions = appList.filter(a => ['received', 'under_review', 'shortlisted'].includes(a.status)).length
  const avgTrustScore   = appList.length
    ? Math.round(appList.reduce((s, a) => s + (a.org?.trust_score ?? 0), 0) / appList.length)
    : null

  const recentApps = appList.slice(0, 8)

  return (
    <FunderShell orgName={funder.org_name}>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-[#0D1117] text-2xl">
              Welcome back, {funder.org_name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here&apos;s your grants overview.</p>
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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active grants',       value: activeGrants,    color: 'text-[#0F2B4C]', icon: '📋' },
            { label: 'Total applications',  value: totalApps,       color: 'text-blue-600',   icon: '📨' },
            { label: 'Decisions pending',   value: pendingDecisions, color: 'text-amber-600', icon: '⏳' },
            { label: 'Avg. Trust Score',    value: avgTrustScore !== null ? `${avgTrustScore}/100` : '—', color: 'text-green-600', icon: '🏅' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-3xl font-bold font-display ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active grants */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-display font-bold text-[#0D1117]">Your grants</h2>
              <Link href="/funder/grants" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
            {grantList.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No grants posted yet.</p>
                <Link href="/funder/grants/create" className="text-sm text-[#0F2B4C] font-semibold hover:underline">
                  Post your first grant →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {grantList.slice(0, 5).map(grant => (
                  <Link
                    key={grant.id}
                    href={`/funder/grants/${grant.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0D1117] truncate">{grant.title}</p>
                      {grant.max_grant && (
                        <p className="text-xs text-gray-400 mt-0.5">Up to £{grant.max_grant.toLocaleString()}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0 ${STATUS_COLORS[grant.status]}`}>
                      {grant.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent applications */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-display font-bold text-[#0D1117]">Recent applications</h2>
              <Link href="/funder/applications" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
            {recentApps.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">No applications yet.</p>
                <p className="text-gray-400 text-xs mt-1">Publish a grant to start receiving applications.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentApps.map(app => (
                  <Link
                    key={app.id}
                    href={`/funder/applications/${app.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0D1117] truncate">{app.org?.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{app.grant?.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {app.org?.trust_score > 0 && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                          app.org.trust_score >= 70 ? 'bg-green-100 text-green-700' :
                          app.org.trust_score >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {app.org.trust_score}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${APP_STATUS_COLORS[app.status] ?? 'bg-gray-50 text-gray-500'}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FunderShell>
  )
}
