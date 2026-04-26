import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import GrantDetailClient from './GrantDetailClient'
import { formatCurrency, formatDate, daysUntil, scoreColor, deadlineColor } from '@/lib/utils'
import type { GrantMatchWithGrant } from '@/types'

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const { data: grant } = await supabase.from('grants').select('*').eq('id', id).single()
  if (!grant) notFound()

  const { data: match } = await supabase
    .from('grant_matches')
    .select('*')
    .eq('user_id', user.id)
    .eq('grant_id', id)
    .single()

  const days = daysUntil(grant.deadline)
  const plan = profile?.plan ?? 'free'
  const isPaid = plan === 'starter' || plan === 'pro' || plan === 'agency'
  const isPro = isPaid // alias used by GrantDetailClient

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0F4C35] mb-6 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to dashboard
        </Link>

        {/* Grant header */}
        <div className="card mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0D1117]">
                {isPaid ? grant.name : (grant.public_title ?? `${grant.funder_type ?? 'UK'} Grant Opportunity`)}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {isPaid ? grant.funder : (grant.funder_type ?? 'UK Funder')}
              </p>
            </div>
            {match && (
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${scoreColor(match.eligibility_score)}`}>
                {match.eligibility_score}/10 match
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Award range</p>
              <p className="font-semibold text-[#0D1117]">
                {formatCurrency(grant.min_award)} – {formatCurrency(grant.max_award)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
              <p className={`font-semibold ${deadlineColor(days)}`}>
                {formatDate(grant.deadline)}
                {days > 0 && <span className="text-xs font-normal ml-1">({days} days)</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Sectors</p>
              <p className="font-medium text-sm text-[#0D1117] capitalize">{grant.sectors.join(', ')}</p>
            </div>
          </div>

          {isPaid ? (
            <a
              href={grant.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm py-2.5"
            >
              Apply Now
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ) : (
            <Link
              href="/pricing"
              className="btn-primary text-sm py-2.5"
            >
              🔒 Upgrade to Apply
            </Link>
          )}
        </div>

        {/* Description & criteria */}
        <div className="card mb-5">
          <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-3">About this grant</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-5">{grant.description}</p>
          <h3 className="font-semibold text-sm text-[#0D1117] mb-2">Eligibility criteria</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{grant.eligibility_criteria}</p>
          {grant.income_requirements && (
            <>
              <h3 className="font-semibold text-sm text-[#0D1117] mt-4 mb-2">Income requirements</h3>
              <p className="text-gray-600 text-sm">{grant.income_requirements}</p>
            </>
          )}
        </div>

        {/* AI match analysis */}
        {match && (
          <div className="card mb-5">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-4">Your eligibility analysis</h2>
            <div className="bg-[#E8F2ED] rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-[#0F4C35] mb-1">Why you qualify</p>
              <p className="text-sm text-[#0D1117] leading-relaxed">{match.match_reason}</p>
            </div>
            {match.watch_out && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">Watch out for</p>
                <p className="text-sm text-amber-800 leading-relaxed">{match.watch_out}</p>
              </div>
            )}
          </div>
        )}

        {/* AI Draft Generator */}
        <GrantDetailClient
          grantId={grant.id}
          matchId={match?.id}
          matchStatus={match?.status}
          matchNotes={match?.notes ?? ''}
          isPro={isPro}
        />
      </div>
    </AppShell>
  )
}
