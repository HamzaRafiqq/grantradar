import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'

export const metadata: Metadata = {
  title: 'Dashboard — FundsRadar',
  robots: { index: false, follow: false },
}
import DashboardClient from './DashboardClient'
import DashboardGrants from './DashboardGrants'
import TrustScoreWidget from './TrustScoreWidget'
import type { GrantMatchWithGrant } from '@/types'
import { daysUntil } from '@/lib/utils'
import { getLocale, getGreeting, formatLocalAmount } from '@/lib/locale'
import { calculateTrustScore } from '@/lib/trust-score'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/onboarding')

  const { data: matches } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)
    .order('eligibility_score', { ascending: false })

  const { data: pipeline } = await supabase
    .from('pipeline_items')
    .select('stage, grant:grants(max_award)')
    .eq('user_id', user.id)

  const typedMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]

  const plan = profile?.plan ?? 'free'
  const locale = getLocale(org.country)
  const greeting = getGreeting()

  const closingSoon = typedMatches.filter((m) => { const d = daysUntil(m.grant.deadline); return d !== null && d <= 30 && d > 0 })
  const highScore = typedMatches.filter((m) => m.eligibility_score >= 70)
  const totalPotential = typedMatches.reduce((sum, m) => sum + (m.grant.max_award || 0), 0)
  const wonValue = (pipeline ?? [])
    .filter((p: { stage: string }) => p.stage === 'won')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((sum: number, p: any) => sum + (p.grant?.max_award || 0), 0)

  const displayValue = wonValue > 0 ? wonValue : totalPotential
  const displayAmount = formatLocalAmount(displayValue, 'GBP', locale.currency, locale.currencySymbol)

  // ── Trust Score ────────────────────────────────────────────────────────────
  // Fetch latest history entry; if none exists, calculate now
  const { data: latestHistory } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let trustData = latestHistory
    ? {
        total:        latestHistory.total_score,
        scores: {
          governance:         latestHistory.governance_score,
          financial:          latestHistory.financial_score,
          documents:          latestHistory.document_score,
          trackRecord:        latestHistory.track_record_score,
          applicationQuality: latestHistory.application_score,
        },
        improvements: (latestHistory.improvements as string[]) ?? [],
      }
    : null

  if (!trustData) {
    try {
      const result = await calculateTrustScore(org.id, supabase)
      trustData = { total: result.total, scores: result.scores, improvements: result.improvements }
    } catch {
      trustData = {
        total: 0,
        scores: { governance: 0, financial: 0, documents: 0, trackRecord: 0, applicationQuality: 0 },
        improvements: ['Complete your charity profile to get your Trust Score'],
      }
    }
  }

  const stats = [
    { label: 'Matched Grants', value: typedMatches.length.toString(), icon: '🎯' },
    { label: 'Strong Matches', value: highScore.length.toString(), icon: '⭐', highlight: highScore.length > 0 },
    { label: 'Closing in 30d', value: closingSoon.length.toString(), icon: '⏰', warn: closingSoon.length > 0 },
    {
      label: wonValue > 0 ? 'Funding Won' : 'Total Potential',
      value: displayAmount.primary,
      icon: wonValue > 0 ? '🏆' : locale.currencySymbol,
    },
  ]

  return (
    <AppShell orgName={org.name} plan={profile?.plan} charityNumber={org.charity_number}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <p className="text-gray-400 text-sm mb-0.5">{greeting} {locale.flag}</p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0D1117]">
              {org.name.charAt(0) + org.name.slice(1).toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              {locale.orgTerm.charAt(0).toUpperCase() + locale.orgTerm.slice(1)} · {org.country ?? 'United Kingdom'} · Your matched grants
            </p>
          </div>
          <DashboardClient organisationId={org.id} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 sm:p-5 border-l-4 animate-scale-in ${stat.warn ? 'border-orange-400' : stat.highlight ? 'border-[#00C875]' : 'border-transparent'}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-lg sm:text-xl mb-1.5 sm:mb-2">{stat.icon}</div>
              <div className={`font-bold text-xl sm:text-3xl leading-none truncate ${stat.warn ? 'text-orange-500' : stat.highlight ? 'text-[#0F4C35]' : 'text-[#0D1117]'}`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Trust Score — compact full-width strip */}
        <div className="mb-6">
          <TrustScoreWidget initial={trustData} compact />
        </div>

        {/* Grant cards — full width */}
        {typedMatches.length === 0 ? (
          <div className="card text-center py-16 max-w-xl mx-auto">
            <div className="text-5xl mb-5">🚀</div>
            <h3 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Let&apos;s find your first grants</h3>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Our AI will search thousands of grant sources worldwide and match the best opportunities to your {locale.orgTerm} profile.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-left">
              {[
                { step: '1', label: 'AI searches grant databases', icon: '🔍' },
                { step: '2', label: 'Matches grants to your profile', icon: '🤖' },
                { step: '3', label: 'Shows your eligibility score', icon: '⭐' },
              ].map(s => (
                <div key={s.step} className="bg-[#F4F6F5] rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-xs text-gray-600 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
            <DashboardClient organisationId={org.id} showButton />
          </div>
        ) : (
          <DashboardGrants matches={typedMatches} plan={plan} orgCountry={org.country} />
        )}
      </div>
    </AppShell>
  )
}
