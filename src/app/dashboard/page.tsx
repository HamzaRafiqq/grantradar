import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import DashboardClient from './DashboardClient'
import DashboardGrants from './DashboardGrants'
import type { GrantMatchWithGrant } from '@/types'
import { daysUntil } from '@/lib/utils'
import { getLocale, getGreeting, formatLocalAmount } from '@/lib/locale'

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

  const closingSoon = typedMatches.filter((m) => daysUntil(m.grant.deadline) <= 30 && daysUntil(m.grant.deadline) > 0)
  const highScore = typedMatches.filter((m) => m.eligibility_score >= 70)
  const totalPotential = typedMatches.reduce((sum, m) => sum + (m.grant.max_award || 0), 0)
  const wonValue = (pipeline ?? [])
    .filter((p: { stage: string }) => p.stage === 'won')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((sum: number, p: any) => sum + (p.grant?.max_award || 0), 0)

  const displayValue = wonValue > 0 ? wonValue : totalPotential
  const displayAmount = formatLocalAmount(displayValue, 'GBP', locale.currency, locale.currencySymbol)

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
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-gray-400 text-sm mb-0.5">{greeting} {locale.flag}</p>
            <h1 className="font-display text-2xl font-bold text-[#0D1117]">{org.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {locale.orgTerm.charAt(0).toUpperCase() + locale.orgTerm.slice(1)} · {org.country ?? 'United Kingdom'} · Your matched grants
            </p>
          </div>
          <DashboardClient organisationId={org.id} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`font-bold text-2xl ${stat.warn ? 'text-orange-500' : stat.highlight ? 'text-[#0F4C35]' : 'text-[#0D1117]'}`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Grant cards */}
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
