'use client'

import { useState, useMemo } from 'react'
import GrantCard from '@/components/ui/GrantCard'
import type { GrantMatchWithGrant } from '@/types'
import { daysUntil } from '@/lib/utils'

interface Props {
  matches: GrantMatchWithGrant[]
  isFree: boolean
}

export default function DashboardGrants({ matches, isFree }: Props) {
  const [showClosed, setShowClosed] = useState(false)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const openMatches = useMemo(
    () => matches.filter((m) => !m.grant.deadline || m.grant.deadline >= today || daysUntil(m.grant.deadline) > 0),
    [matches, today]
  )

  const closedMatches = useMemo(
    () => matches.filter((m) => m.grant.deadline && m.grant.deadline < today && daysUntil(m.grant.deadline) <= 0),
    [matches, today]
  )

  const visibleMatches = showClosed ? matches : openMatches

  if (matches.length === 0) return null

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-[#0D1117]">{visibleMatches.length}</span> grant{visibleMatches.length !== 1 ? 's' : ''}
          {!showClosed && closedMatches.length > 0 && (
            <span className="text-gray-400">
              {' '}·{' '}
              <button
                onClick={() => setShowClosed(true)}
                className="text-[#0F4C35] hover:underline font-medium"
              >
                {closedMatches.length} closed grant{closedMatches.length !== 1 ? 's' : ''} hidden — show them
              </button>
            </span>
          )}
        </p>
        {showClosed && closedMatches.length > 0 && (
          <button
            onClick={() => setShowClosed(false)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Hide closed grants
          </button>
        )}
      </div>

      {/* Grant grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleMatches.map((match, i) => (
          <GrantCard
            key={match.id}
            match={match}
            isLocked={isFree && i >= 3}
          />
        ))}
      </div>
    </div>
  )
}
