import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import AlertPreferences from './AlertPreferences'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import type { GrantMatchWithGrant } from '@/types'

function DeadlineRow({ match }: { match: GrantMatchWithGrant }) {
  const days = daysUntil(match.grant.deadline)
  const badge =
    days <= 7
      ? { cls: 'bg-red-100 text-red-700 border border-red-200', label: `${days}d — Urgent` }
      : days <= 14
      ? { cls: 'bg-orange-100 text-orange-700 border border-orange-100', label: `${days}d — Soon` }
      : { cls: 'bg-amber-50 text-amber-700 border border-amber-100', label: `${days}d left` }

  const rowBorder =
    days <= 7 ? 'border-l-4 border-l-red-400' : days <= 14 ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-green-400'

  return (
    <div className={`card flex flex-col sm:flex-row sm:items-center gap-4 ${rowBorder}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <span className="text-xs text-gray-400">Closes {formatDate(match.grant.deadline)}</span>
        </div>
        <h3 className="font-display font-semibold text-[#0D1117] text-sm">{match.grant.name}</h3>
        <p className="text-gray-400 text-xs mt-0.5">{match.grant.funder}</p>
        <p className="text-[#0F4C35] text-sm font-semibold mt-1">
          {!match.grant.max_award || match.grant.max_award === 0
            ? 'Amount TBC'
            : match.grant.min_award > 0
            ? `${formatCurrency(match.grant.min_award)} – ${formatCurrency(match.grant.max_award)}`
            : `Up to ${formatCurrency(match.grant.max_award)}`}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Link href={`/grants/${match.grant.id}`} className="btn-secondary text-sm py-2 px-4">
          View Grant
        </Link>
        {match.grant.application_url && (
          <a href={match.grant.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 px-4">
            Apply →
          </a>
        )}
      </div>
    </div>
  )
}

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const isPro = profile?.plan === 'pro'

  const { data: matches } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const typedMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const closing = typedMatches
    .filter((m) => {
      const d = daysUntil(m.grant.deadline)
      return d > 0 && d <= 30
    })
    .sort((a, b) => daysUntil(a.grant.deadline) - daysUntil(b.grant.deadline))

  const newThisWeek = typedMatches.filter(
    (m) => m.created_at && m.created_at >= sevenDaysAgo
  )

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Grant Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">Stay on top of deadlines and new matches</p>
        </div>

        {/* Pro upsell */}
        {!isPro && (
          <div className="bg-[#0F4C35] text-white rounded-[12px] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold mb-0.5">Get email deadline alerts with Pro</p>
              <p className="text-white/70 text-sm">We'll email you 30, 7 days and 48 hours before each grant closes.</p>
            </div>
            <Link href="/pricing" className="bg-[#00C875] text-[#0D1117] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#009E5D] hover:text-white transition-colors flex-shrink-0">
              Upgrade
            </Link>
          </div>
        )}

        {/* Section 1: Upcoming deadlines */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0D1117]">Upcoming Deadlines</h2>
              <p className="text-gray-400 text-sm mt-0.5">Matched grants closing in the next 30 days</p>
            </div>
            {closing.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                {closing.length} closing soon
              </span>
            )}
          </div>

          {closing.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-3xl mb-3">🎉</div>
              <p className="font-semibold text-[#0D1117] text-sm mb-1">No urgent deadlines</p>
              <p className="text-gray-400 text-xs">None of your matched grants close in the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {closing.map((match) => (
                <DeadlineRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: New matches this week */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0D1117]">New Matches This Week</h2>
              <p className="text-gray-400 text-sm mt-0.5">Grants matched to your profile in the last 7 days</p>
            </div>
            {newThisWeek.length > 0 && (
              <span className="bg-[#E8F2ED] text-[#0F4C35] text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                {newThisWeek.length} new
              </span>
            )}
          </div>

          {newThisWeek.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-semibold text-[#0D1117] text-sm mb-1">No new matches yet this week</p>
              <p className="text-gray-400 text-xs mb-4">Click "Discover" on the dashboard to search for new grants.</p>
              <Link href="/dashboard" className="btn-primary text-sm py-2 inline-flex">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {newThisWeek.map((match) => (
                <div key={match.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-[#00C875] text-[#0D1117] text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        {match.eligibility_score}/10 match
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-[#0D1117] text-sm">{match.grant.name}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{match.grant.funder}</p>
                    <p className="text-[#0F4C35] text-sm font-semibold mt-1">
                      {!match.grant.max_award || match.grant.max_award === 0
                        ? 'Amount TBC'
                        : `Up to ${formatCurrency(match.grant.max_award)}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/grants/${match.grant.id}`} className="btn-secondary text-sm py-2 px-4">
                      View
                    </Link>
                    {match.grant.application_url && (
                      <a href={match.grant.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 px-4">
                        Apply →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Alert preferences */}
        <section>
          <AlertPreferences />
        </section>
      </div>
    </AppShell>
  )
}
