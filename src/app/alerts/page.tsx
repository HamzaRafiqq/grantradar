import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils'
import type { GrantMatchWithGrant } from '@/types'

function urgencyBadge(days: number) {
  if (days <= 7) return { cls: 'bg-red-100 text-red-700', label: `${days}d — Urgent` }
  if (days <= 14) return { cls: 'bg-orange-100 text-orange-700', label: `${days}d — Soon` }
  return { cls: 'bg-amber-50 text-amber-700', label: `${days}d — Upcoming` }
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

  const typedMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]

  const closing = typedMatches
    .filter((m) => {
      const d = daysUntil(m.grant.deadline)
      return d > 0 && d <= 30
    })
    .sort((a, b) => daysUntil(a.grant.deadline) - daysUntil(b.grant.deadline))

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Deadline Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">Matched grants closing within the next 30 days</p>
        </div>

        {!isPro && (
          <div className="bg-[#0F4C35] text-white rounded-[12px] p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold mb-0.5">Get email deadline alerts with Pro</p>
              <p className="text-white/70 text-sm">We'll email you 7 days before each grant closes.</p>
            </div>
            <Link href="/pricing" className="bg-[#00C875] text-[#0D1117] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#009E5D] hover:text-white transition-colors flex-shrink-0">
              Upgrade
            </Link>
          </div>
        )}

        {closing.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-2">No urgent deadlines</h3>
            <p className="text-gray-400 text-sm">None of your matched grants are closing in the next 30 days.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {closing.map((match) => {
              const days = daysUntil(match.grant.deadline)
              const badge = urgencyBadge(days)
              return (
                <div key={match.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-[#0D1117]">{match.grant.name}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{match.grant.funder}</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {formatCurrency(match.grant.min_award)} – {formatCurrency(match.grant.max_award)} • Closes {formatDate(match.grant.deadline)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/grants/${match.grant.id}`} className="btn-secondary text-sm py-2">
                      View
                    </Link>
                    <a
                      href={match.grant.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm py-2"
                    >
                      Apply
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
