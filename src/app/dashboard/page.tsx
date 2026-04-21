import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import GrantCard from '@/components/ui/GrantCard'
import DashboardClient from './DashboardClient'
import type { GrantMatchWithGrant } from '@/types'
import { formatCurrency, daysUntil } from '@/lib/utils'

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

  const typedMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]

  const isFree = profile?.plan === 'free'
  const closingSoon = typedMatches.filter((m) => daysUntil(m.grant.deadline) <= 30 && daysUntil(m.grant.deadline) > 0)
  const inProgress = typedMatches.filter((m) => ['applying', 'researching'].includes(m.status))
  const totalPotential = typedMatches.reduce((sum, m) => sum + m.grant.max_award, 0)

  const stats = [
    { label: 'Matched Grants', value: typedMatches.length.toString(), icon: '🎯' },
    { label: 'Closing Soon', value: closingSoon.length.toString(), icon: '⏰', warn: closingSoon.length > 0 },
    { label: 'In Progress', value: inProgress.length.toString(), icon: '📝' },
    { label: 'Total Potential', value: formatCurrency(totalPotential), icon: '💷' },
  ]

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0D1117]">{org.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">Your matched grants dashboard</p>
          </div>
          <DashboardClient organisationId={org.id} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`font-bold text-2xl ${stat.warn ? 'text-orange-500' : 'text-[#0D1117]'}`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Grant cards */}
        {typedMatches.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-2">No grants matched yet</h3>
            <p className="text-gray-400 text-sm mb-6">Click "Find New Grants" to run the AI matching for your charity.</p>
            <DashboardClient organisationId={org.id} showButton />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {typedMatches.map((match, i) => (
              <GrantCard
                key={match.id}
                match={match}
                isLocked={isFree && i >= 3}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
