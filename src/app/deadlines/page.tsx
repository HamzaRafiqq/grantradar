import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import DeadlinesEmailForm from './DeadlinesEmailForm'

export const metadata: Metadata = {
  title: 'UK Grant Deadlines — Next 90 Days | FundsRadar',
  description: 'Browse all UK grant deadlines for the next 90 days. Free, no signup required. See which grants are closing this week, this month, and next month.',
  openGraph: {
    title: 'UK Grant Deadlines — Next 90 Days | FundsRadar',
    description: 'Browse all UK grant deadlines for the next 90 days. Free, no signup required.',
    type: 'website',
    locale: 'en_GB',
  },
}

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const deadline = new Date(dateStr + 'T00:00:00Z')
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatAmount(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
    return `£${n.toLocaleString()}`
  }
  if (max && min && min !== max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `Up to ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return 'Amount varies'
}

function anonymiseTitle(title: string): string {
  // Show first 3 words then blur the rest
  const words = title.split(' ')
  if (words.length <= 3) return title
  return words.slice(0, 3).join(' ') + ' …'
}

interface Grant {
  id: string
  name: string
  public_title?: string | null
  funder: string
  funder_type?: string | null
  deadline: string
  min_award?: number | null
  max_award?: number | null
}

type GroupKey = 'This Week' | 'This Month' | 'Next Month'

export default async function DeadlinesPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const in90Days = new Date(today)
  in90Days.setUTCDate(today.getUTCDate() + 90)

  const todayStr = today.toISOString().split('T')[0]
  const in90DaysStr = in90Days.toISOString().split('T')[0]

  const { data: grants } = await supabase
    .from('grants')
    .select('id, name, public_title, funder, funder_type, deadline, min_award, max_award')
    .eq('is_active', true)
    .gte('deadline', todayStr)
    .lte('deadline', in90DaysStr)
    .order('deadline', { ascending: true })
    .limit(200)

  const allGrants = (grants ?? []) as Grant[]

  // Group by This Week / This Month / Next Month
  const endOfWeek = new Date(today)
  endOfWeek.setUTCDate(today.getUTCDate() + 7)

  const endOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  const endOfNextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0))

  const groups: Record<GroupKey, Grant[]> = {
    'This Week': [],
    'This Month': [],
    'Next Month': [],
  }

  for (const g of allGrants) {
    const d = new Date(g.deadline + 'T00:00:00Z')
    if (d <= endOfWeek) {
      groups['This Week'].push(g)
    } else if (d <= endOfMonth) {
      groups['This Month'].push(g)
    } else if (d <= endOfNextMonth) {
      groups['Next Month'].push(g)
    }
  }

  const groupMeta: { key: GroupKey; emoji: string; urgency: string }[] = [
    { key: 'This Week', emoji: '🔴', urgency: 'Closing soon' },
    { key: 'This Month', emoji: '🟡', urgency: 'Closing this month' },
    { key: 'Next Month', emoji: '🟢', urgency: 'Coming up' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F4C35] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-5">
            <span className="w-2 h-2 rounded-full bg-[#00C875]" />
            Free — no signup required
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            🗓️ UK Grant Deadlines
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-6">
            All active UK grant deadlines for the next 90 days — updated weekly.
            {allGrants.length > 0 && (
              <span className="font-semibold text-[#00C875]"> {allGrants.length} grants closing soon.</span>
            )}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#00C875] text-[#0D1117] px-6 py-3 rounded-xl font-semibold hover:bg-[#00b368] transition-colors"
          >
            See which ones you qualify for →
          </Link>
        </div>
      </section>

      {/* Grant table */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {allGrants.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg">No grants with deadlines in the next 90 days found.</p>
            <p className="text-sm mt-2">Check back soon — we update our database weekly.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupMeta.map(({ key, emoji, urgency }) => {
              const groupGrants = groups[key]
              if (groupGrants.length === 0) return null
              return (
                <div key={key}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl">{emoji}</span>
                    <h2 className="font-display text-xl font-bold text-[#0D1117]">{key}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {urgency} · {groupGrants.length} grant{groupGrants.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Grant rows */}
                  <div className="space-y-3">
                    {groupGrants.map((g) => {
                      const days = daysUntil(g.deadline)
                      const displayTitle = g.public_title ?? anonymiseTitle(g.name)
                      const isAnon = !g.public_title && g.name.split(' ').length > 3
                      const funderDisplay = g.funder_type ?? 'UK Funder'

                      return (
                        <div
                          key={g.id}
                          className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                          {/* Days badge */}
                          <div className="flex-shrink-0">
                            <div
                              className={`w-16 text-center rounded-xl py-2 font-bold text-sm ${
                                days <= 7
                                  ? 'bg-red-50 text-red-600'
                                  : days <= 30
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {days}d
                            </div>
                            <div className="text-[10px] text-gray-400 text-center mt-1">
                              {formatDeadline(g.deadline)}
                            </div>
                          </div>

                          {/* Grant info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className={`font-semibold text-sm text-[#0D1117] leading-snug ${isAnon ? 'blur-[3px] select-none' : ''}`}>
                                {displayTitle}
                              </h3>
                              {isAnon && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                  Sign in to see full name
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {funderDisplay}
                              </span>
                              <span className="text-xs font-semibold text-[#0F4C35]">
                                {formatAmount(g.min_award, g.max_award)}
                              </span>
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="flex-shrink-0">
                            <Link
                              href="/signup"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0F4C35] hover:bg-[#00C875] hover:text-[#0D1117] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                            >
                              See if you qualify →
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Email signup CTA */}
      <section className="bg-[#0F4C35] py-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
            Get alerts for grants like these
          </h2>
          <p className="text-white/70 text-base mb-8">
            We&apos;ll email you when new grants match your charity — and remind you before deadlines close.
          </p>
          <DeadlinesEmailForm />
          <p className="text-white/40 text-xs mt-4">No spam. Unsubscribe any time.</p>
        </div>
      </section>

      {/* Footer note */}
      <div className="bg-[#0D1117] text-white/30 text-xs text-center py-6 px-4">
        Grant data sourced from 360Giving, National Lottery, UKRI and other UK funders. Updated weekly. |{' '}
        <Link href="/" className="hover:text-white/60 transition-colors">FundsRadar</Link>
        {' '}· <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
      </div>
    </div>
  )
}
