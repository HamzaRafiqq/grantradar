'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { formatCurrency, daysUntil, scoreColor, deadlineColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const statusOptions: { value: MatchStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'researching', label: 'Researching' },
  { value: 'applying', label: 'Applying' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

interface Props {
  match: GrantMatchWithGrant
  isLocked?: boolean
}

export default function GrantCard({ match, isLocked = false }: Props) {
  const [status, setStatus] = useState<MatchStatus>(match.status as MatchStatus)
  const days = daysUntil(match.grant.deadline)
  const supabase = createClient()

  async function updateStatus(newStatus: MatchStatus) {
    setStatus(newStatus)
    await supabase
      .from('grant_matches')
      .update({ status: newStatus })
      .eq('id', match.id)
  }

  const card = (
    <div className={`bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] ${isLocked ? 'relative' : ''}`}>
      {isLocked && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[12px] flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 rounded-full bg-[#0F4C35] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="9" width="12" height="9" rx="2" stroke="white" strokeWidth="1.75"/>
              <path d="M7 9V7a3 3 0 116 0v2" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-semibold text-sm text-[#0D1117] mb-1">Upgrade to Pro</p>
          <p className="text-gray-400 text-xs text-center px-4">Unlock all matched grants with a Pro subscription</p>
          <Link href="/pricing" className="mt-3 bg-[#0F4C35] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#0c3d2a] transition-colors">
            Upgrade — £49/mo
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[#0D1117] text-base leading-snug">{match.grant.name}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{match.grant.funder}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${scoreColor(match.eligibility_score)}`}>
          {match.eligibility_score}/10
        </span>
      </div>

      {/* Match reason */}
      <div className="bg-[#F4F6F5] rounded-xl p-3">
        <p className="text-xs font-semibold text-[#0F4C35] mb-1">Why you match</p>
        <p className="text-xs text-gray-600 leading-relaxed">{match.match_reason}</p>
      </div>

      {/* Watch out */}
      {match.watch_out && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Watch out</p>
          <p className="text-xs text-amber-600 leading-relaxed">{match.watch_out}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3 pt-1 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Award range</p>
            <p className="text-sm font-semibold text-[#0D1117]">
              {formatCurrency(match.grant.min_award)} – {formatCurrency(match.grant.max_award)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Deadline</p>
            <p className={`text-sm font-medium ${deadlineColor(days)}`}>
              {days <= 0
                ? 'Closed'
                : days === 1
                  ? 'Tomorrow'
                  : `${days} days`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value as MatchStatus)}
            className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Link
            href={`/grants/${match.grant.id}`}
            className="flex-1 bg-[#0F4C35] text-white text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-[#0c3d2a] transition-colors text-center"
          >
            View & Apply
          </Link>
        </div>
      </div>
    </div>
  )

  return card
}
