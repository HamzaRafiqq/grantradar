import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import AlertPreferences from './AlertPreferences'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import type { GrantMatchWithGrant } from '@/types'

export const metadata: Metadata = {
  title: 'Grant Alerts — FundsRadar',
  robots: { index: false, follow: false },
}

const FREE_LIMIT = 3

function isPaidPlan(plan: string | null | undefined) {
  return plan === 'starter' || plan === 'pro' || plan === 'agency'
}

// ── Locked placeholder row ──────────────────────────────────────────────────

function LockedRow() {
  return (
    <div className="card border-l-4 border-l-gray-200 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 opacity-40 pointer-events-none select-none blur-[2px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">14d left</span>
          </div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="h-9 w-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm border border-gray-200">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#6B7280" strokeWidth="1.5"/>
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-semibold text-gray-500">Upgrade to view</span>
        </div>
      </div>
    </div>
  )
}

// ── Grant row ───────────────────────────────────────────────────────────────

function AlertRow({ match, paid }: { match: GrantMatchWithGrant; paid: boolean }) {
  const days = daysUntil(match.grant.deadline)
  const badge =
    days <= 7  ? { cls: 'bg-red-100 text-red-700 border border-red-200', label: `${days}d — Urgent` }
    : days <= 14 ? { cls: 'bg-orange-100 text-orange-700 border border-orange-100', label: `${days}d — Soon` }
    : { cls: 'bg-amber-50 text-amber-700 border border-amber-100', label: `${days}d left` }

  const rowBorder =
    days <= 7 ? 'border-l-4 border-l-red-400'
    : days <= 14 ? 'border-l-4 border-l-orange-400'
    : 'border-l-4 border-l-green-400'

  const displayName   = paid ? match.grant.name   : (match.grant.public_title  ?? `${match.grant.funder_type ?? 'UK'} Grant Opportunity`)
  const displayFunder = paid ? match.grant.funder  : (match.grant.funder_type   ?? 'UK Funder')

  return (
    <div className={`card p-4 sm:p-5 flex flex-col gap-3 ${rowBorder}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
            <span className="text-xs text-gray-400">Closes {formatDate(match.grant.deadline)}</span>
          </div>
          <h3 className="font-display font-semibold text-[#0D1117] text-sm leading-snug">{displayName}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{displayFunder}</p>
          <p className="text-[#0F4C35] text-sm font-semibold mt-1">
            {!match.grant.max_award || match.grant.max_award === 0
              ? 'Amount TBC'
              : match.grant.min_award > 0
              ? `${formatCurrency(match.grant.min_award)} – ${formatCurrency(match.grant.max_award)}`
              : `Up to ${formatCurrency(match.grant.max_award)}`}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/grants/${match.grant.id}`} className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 flex-1 sm:flex-none text-center">
          View Grant
        </Link>
        {paid && match.grant.application_url && (
          <a href={match.grant.application_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4 flex-1 sm:flex-none text-center">
            Apply →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org }     = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const plan = profile?.plan ?? 'free'
  const paid = isPaidPlan(plan)

  // Same query as dashboard — ordered by eligibility_score so same grants appear
  const { data: matches } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)
    .not('status', 'in', '(won,lost)')
    .order('eligibility_score', { ascending: false })

  const allMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]

  // ── Cap free users to the same 3 grants as the dashboard ──────────────────
  const visibleMatches = paid ? allMatches : allMatches.slice(0, FREE_LIMIT)
  const hiddenCount    = paid ? 0 : Math.max(0, allMatches.length - FREE_LIMIT)

  // ── Split into sections from the already-capped pool ──────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const closing = visibleMatches
    .filter(m => { const d = daysUntil(m.grant.deadline); return d > 0 && d <= 30 })
    .sort((a, b) => daysUntil(a.grant.deadline) - daysUntil(b.grant.deadline))

  const newThisWeek = visibleMatches.filter(
    m => m.created_at && m.created_at >= sevenDaysAgo
  )

  // Grants that don't fit either section
  const other = visibleMatches.filter(
    m => !closing.includes(m) && !newThisWeek.includes(m)
  )

  return (
    <AppShell orgName={org.name} plan={plan} charityNumber={org.charity_number}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Grant Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">Stay on top of deadlines and new matches</p>
        </div>

        {/* Free plan banner */}
        {!paid && (
          <div className="bg-[#0F4C35] text-white rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <p className="font-semibold mb-0.5">You&apos;re on the Free plan</p>
              <p className="text-white/70 text-sm">
                Showing {Math.min(FREE_LIMIT, allMatches.length)} of {allMatches.length} matched grants.
                Upgrade to unlock all grants, full funder names and email alerts.
              </p>
            </div>
            <Link
              href="/pricing"
              className="bg-[#00C875] text-[#0D1117] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#009E5D] hover:text-white transition-colors flex-shrink-0 text-center"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {/* ── Upcoming deadlines (from capped pool) ── */}
        {closing.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#0D1117]">Upcoming Deadlines</h2>
                <p className="text-gray-400 text-sm mt-0.5">Closing in the next 30 days</p>
              </div>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                {closing.length} closing soon
              </span>
            </div>
            <div className="space-y-3">
              {closing.map(m => <AlertRow key={m.id} match={m} paid={paid} />)}
            </div>
          </section>
        )}

        {/* ── New matches this week (from capped pool) ── */}
        {newThisWeek.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#0D1117]">New Matches This Week</h2>
                <p className="text-gray-400 text-sm mt-0.5">Matched in the last 7 days</p>
              </div>
              <span className="bg-[#E8F2ED] text-[#0F4C35] text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                {newThisWeek.length} new
              </span>
            </div>
            <div className="space-y-3">
              {newThisWeek.map(m => <AlertRow key={m.id} match={m} paid={paid} />)}
            </div>
          </section>
        )}

        {/* ── Other matched grants (from capped pool) ── */}
        {other.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold text-[#0D1117] mb-4">Your Matched Grants</h2>
            <div className="space-y-3">
              {other.map(m => <AlertRow key={m.id} match={m} paid={paid} />)}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {visibleMatches.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-3xl mb-3">🔍</div>
            <p className="font-semibold text-[#0D1117] text-sm mb-1">No matched grants yet</p>
            <p className="text-gray-400 text-xs mb-4">Go to your dashboard to discover grants for your charity.</p>
            <Link href="/dashboard" className="btn-primary text-sm py-2 inline-flex">
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* ── Upgrade gate (locked rows) ── */}
        {hiddenCount > 0 && (
          <section>
            <div className="space-y-3 mb-4">
              {[...Array(Math.min(hiddenCount, 2))].map((_, i) => (
                <LockedRow key={i} />
              ))}
            </div>
            <div className="bg-gradient-to-br from-[#0F4C35] to-[#0c3d2a] rounded-[12px] p-6 text-center text-white">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-display font-bold text-lg mb-1">
                {hiddenCount} more grant{hiddenCount !== 1 ? 's' : ''} hidden
              </h3>
              <p className="text-white/70 text-sm mb-5">
                Upgrade to see all your matched grants, full funder names, apply links and email deadline alerts.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-[#00C875] text-[#0D1117] px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#00b368] transition-colors"
              >
                Upgrade from £9/month →
              </Link>
            </div>
          </section>
        )}

        {/* ── Alert preferences ── */}
        <section>
          <AlertPreferences />
        </section>

      </div>
    </AppShell>
  )
}
