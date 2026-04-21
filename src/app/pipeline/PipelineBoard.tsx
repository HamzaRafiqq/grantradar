'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { formatCurrency, daysUntil, scoreColor } from '@/lib/utils'

const COLUMNS: { id: MatchStatus; label: string; emoji: string; bg: string; border: string }[] = [
  { id: 'new',         label: 'New',         emoji: '🔍', bg: 'bg-gray-50',    border: 'border-gray-200' },
  { id: 'researching', label: 'Researching', emoji: '📚', bg: 'bg-blue-50',   border: 'border-blue-200' },
  { id: 'applying',    label: 'Applying',    emoji: '✍️', bg: 'bg-amber-50',  border: 'border-amber-200' },
  { id: 'submitted',   label: 'Submitted',   emoji: '📤', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'won',         label: 'Won',         emoji: '🏆', bg: 'bg-green-50',  border: 'border-green-200' },
  { id: 'lost',        label: 'Lost',        emoji: '❌', bg: 'bg-red-50',    border: 'border-red-200' },
]

interface Props {
  matches: GrantMatchWithGrant[]
  isPro: boolean
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  setTimeout(onDone, 2500)
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50 animate-fade-in">
      {message}
    </div>
  )
}

export default function PipelineBoard({ matches: initial, isPro }: Props) {
  const [matches, setMatches] = useState(initial)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<MatchStatus | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()

  const colMatches = useCallback(
    (col: MatchStatus) => matches.filter((m) => m.status === col),
    [matches]
  )

  async function handleDrop(col: MatchStatus) {
    if (!dragging || dragging === col) return
    const match = matches.find(m => m.id === dragging)
    setDragging(null)
    setDragOver(null)
    if (!match || match.status === col) return

    const colLabel = COLUMNS.find(c => c.id === col)?.label ?? col
    setMatches(prev => prev.map(m => m.id === dragging ? { ...m, status: col } : m))
    setToast(`Moved to ${colLabel}`)
    await supabase.from('grant_matches').update({ status: col }).eq('id', match.id)
  }

  // Summary stats
  const totalTracked = matches.length
  const totalValue = matches.reduce((s, m) => s + (m.grant.max_award || 0), 0)
  const wonMatches = matches.filter(m => m.status === 'won')
  const wonValue = wonMatches.reduce((s, m) => s + (m.grant.max_award || 0), 0)
  const submitted = matches.filter(m => m.status === 'submitted' || m.status === 'won' || m.status === 'lost').length
  const successRate = submitted > 0 ? Math.round((wonMatches.length / submitted) * 100) : 0

  if (!isPro) {
    return (
      <div className="card max-w-md mx-auto text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-2">Pipeline is a Pro feature</h3>
        <p className="text-gray-400 text-sm mb-6">
          Track your applications on a visual kanban board with drag-and-drop.
        </p>
        <Link href="/pricing" className="btn-primary justify-center">
          Upgrade to Pro — £49/mo
        </Link>
      </div>
    )
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Grants tracked', value: totalTracked.toString(), icon: '📋' },
          { label: 'Total value', value: formatCurrency(totalValue), icon: '💷' },
          { label: 'Won so far', value: formatCurrency(wonValue), icon: '🏆', green: true },
          { label: 'Success rate', value: `${successRate}%`, icon: '📊' },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`font-bold text-xl ${stat.green ? 'text-green-600' : 'text-[#0D1117]'}`}>{stat.value}</div>
            <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {COLUMNS.map((col) => {
          const cards = colMatches(col.id)
          const colValue = cards.reduce((s, m) => s + (m.grant.max_award || 0), 0)
          const isOver = dragOver === col.id

          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-64 rounded-[14px] border ${col.border} ${col.bg} p-3 transition-shadow ${isOver ? 'ring-2 ring-[#0F4C35] shadow-lg' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm text-[#0D1117] flex items-center gap-1.5">
                  {col.emoji} {col.label}
                </h3>
                <span className="text-xs font-bold bg-white/70 text-gray-500 px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>
              {colValue > 0 && (
                <p className="text-xs text-gray-400 mb-3">{formatCurrency(colValue)}</p>
              )}

              {/* Cards */}
              <div className="space-y-2 min-h-[60px]">
                {cards.map((m) => {
                  const days = daysUntil(m.grant.deadline)
                  const urgent = days > 0 && days <= 7
                  const soon = days > 7 && days <= 14

                  return (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => setDragging(m.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      className={`bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-opacity border-l-4
                        ${urgent ? 'border-l-red-400' : soon ? 'border-l-amber-400' : 'border-l-transparent'}
                        ${dragging === m.id ? 'opacity-40' : 'opacity-100 hover:shadow-md'}`}
                    >
                      {/* Urgent badge */}
                      {urgent && (
                        <span className="inline-block mb-1.5 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          URGENT — {days}d left
                        </span>
                      )}
                      {soon && !urgent && (
                        <span className="inline-block mb-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {days}d left
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-semibold text-[#0D1117] leading-tight line-clamp-2">{m.grant.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${scoreColor(m.eligibility_score)}`}>
                          {m.eligibility_score}/10
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 mb-2">{m.grant.funder}</p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#0F4C35]">
                          {!m.grant.max_award || m.grant.max_award === 0 ? 'TBC' : formatCurrency(m.grant.max_award)}
                        </p>
                        {days <= 0 && <p className="text-xs text-gray-300">Closed</p>}
                        {days > 14 && <p className="text-xs text-gray-400">{days}d left</p>}
                      </div>

                      <Link
                        href={`/grants/${m.grant.id}`}
                        className="mt-2 block text-center text-xs font-medium text-[#0F4C35] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open →
                      </Link>
                    </div>
                  )
                })}

                {cards.length === 0 && (
                  <div className="h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
                    <p className="text-xs text-gray-300 font-medium">Empty</p>
                    <p className="text-[10px] text-gray-200">Drag grants here</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
