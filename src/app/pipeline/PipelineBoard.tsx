'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { formatCurrency, daysUntil, scoreColor } from '@/lib/utils'

const COLUMNS: { id: MatchStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-gray-100' },
  { id: 'researching', label: 'Researching', color: 'bg-blue-50' },
  { id: 'applying', label: 'Applying', color: 'bg-amber-50' },
  { id: 'submitted', label: 'Submitted', color: 'bg-purple-50' },
  { id: 'won', label: 'Won', color: 'bg-green-50' },
  { id: 'lost', label: 'Lost', color: 'bg-red-50' },
]

interface Props {
  matches: GrantMatchWithGrant[]
  isPro: boolean
}

export default function PipelineBoard({ matches: initial, isPro }: Props) {
  const [matches, setMatches] = useState(initial)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<MatchStatus | null>(null)
  const supabase = createClient()

  function handleDragStart(matchId: string) {
    setDragging(matchId)
  }

  function handleDragOver(e: React.DragEvent, col: MatchStatus) {
    e.preventDefault()
    setDragOver(col)
  }

  async function handleDrop(col: MatchStatus) {
    if (!dragging) return
    setDragging(null)
    setDragOver(null)

    setMatches((prev) =>
      prev.map((m) => m.id === dragging ? { ...m, status: col } : m)
    )

    await supabase.from('grant_matches').update({ status: col }).eq('id', dragging)
  }

  function colTotal(col: MatchStatus) {
    return matches
      .filter((m) => m.status === col)
      .reduce((sum, m) => sum + m.grant.max_award, 0)
  }

  if (!isPro) {
    return (
      <div className="card max-w-md mx-auto text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-2">Pipeline is a Pro feature</h3>
        <p className="text-gray-400 text-sm mb-6">
          Track your applications on a visual kanban board with drag-and-drop. Upgrade to Pro to unlock it.
        </p>
        <Link href="/pricing" className="btn-primary justify-center">
          Upgrade to Pro — £49/mo
        </Link>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colMatches = matches.filter((m) => m.status === col.id)
        const total = colTotal(col.id)
        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-64 rounded-[12px] p-3 ${col.color} ${dragOver === col.id ? 'ring-2 ring-[#0F4C35]' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={() => handleDrop(col.id)}
            onDragLeave={() => setDragOver(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-[#0D1117]">{col.label}</h3>
              <span className="text-xs text-gray-400 font-medium">{colMatches.length}</span>
            </div>
            {total > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                {formatCurrency(total)} potential
              </p>
            )}
            <div className="space-y-2">
              {colMatches.map((m) => {
                const days = daysUntil(m.grant.deadline)
                return (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={() => handleDragStart(m.id)}
                    className={`bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${dragging === m.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-[#0D1117] leading-tight">{m.grant.name}</p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${scoreColor(m.eligibility_score)}`}>
                        {m.eligibility_score}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{m.grant.funder}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#0D1117]">{formatCurrency(m.grant.max_award)}</p>
                      {days > 0 && (
                        <p className={`text-xs ${days <= 7 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {days}d left
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/grants/${m.grant.id}`}
                      className="mt-2 block text-center text-xs text-[#0F4C35] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </div>
                )
              })}
              {colMatches.length === 0 && (
                <div className="h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <p className="text-xs text-gray-300">Drop here</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
