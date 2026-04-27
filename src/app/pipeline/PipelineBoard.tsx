'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { canSeeFunderName } from '@/lib/plans'
import { daysUntil, scoreColor } from '@/lib/utils'
import DetailPanel, { type DetailMatch } from './DetailPanel'

// ── Types ──────────────────────────────────────────────────────────────────────

type AppMatch = DetailMatch

// ── Constants ──────────────────────────────────────────────────────────────────

const COLUMNS: { id: MatchStatus; label: string; color: string; bg: string; border: string; empty: string }[] = [
  { id: 'new',         label: 'Saved',      color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200',  empty: 'Save grants from your dashboard to start tracking' },
  { id: 'researching', label: 'Researching', color: 'text-blue-600',  bg: 'bg-blue-50',    border: 'border-blue-200',  empty: 'Move grants here when you\'re researching them' },
  { id: 'applying',    label: 'Applying',   color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200',empty: 'Move grants here when you\'re writing an application' },
  { id: 'submitted',   label: 'Submitted',  color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200',empty: 'Submitted applications appear here' },
  { id: 'won',         label: 'Won',        color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200', empty: 'Celebrate your wins here 🏆' },
  { id: 'lost',        label: 'Lost',       color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200',   empty: 'Unsuccessful applications appear here' },
]

// ── Deadline badge ─────────────────────────────────────────────────────────────

function DeadlineBadge({ deadline }: { deadline?: string | null }) {
  if (!deadline) return null
  const days = daysUntil(deadline)
  if (days <= 0) return <span className="text-[10px] font-semibold text-gray-400">Overdue</span>
  if (days <= 2)  return <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">{days}d left 🔴</span>
  if (days <= 7)  return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">{days}d left 🟠</span>
  if (days <= 30) return <span className="text-[10px] font-medium text-amber-600">{days}d left</span>
  return <span className="text-[10px] text-gray-400">{days}d left</span>
}

// ── Static card content (shared between real card and drag overlay) ─────────────

function CardContent({ match, plan, overlay = false }: { match: AppMatch; plan: string; overlay?: boolean }) {
  const showFunder = canSeeFunderName(plan)
  const deadline   = (match as AppMatch).deadline_set ?? match.grant.deadline
  const displayName   = showFunder ? match.grant.name : (match.grant.public_title ?? match.grant.name)
  const displayFunder = showFunder ? match.grant.funder : (match.grant.funder_type ?? 'UK Funder')
  const amount = (match as AppMatch).amount_requested ?? match.grant.max_award

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm select-none border border-gray-100 ${overlay ? 'shadow-2xl rotate-1 scale-105' : ''}`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs font-semibold text-[#0D1117] leading-tight line-clamp-2 flex-1">{displayName}</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${scoreColor(match.eligibility_score)}`}>
          {match.eligibility_score}/10
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
        {!showFunder && (
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
            <rect x="2" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4.5 6.5V5a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        {displayFunder}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#0F4C35]">
          {amount > 0 ? `£${amount.toLocaleString()}` : 'TBC'}
        </p>
        <DeadlineBadge deadline={deadline} />
      </div>
      {match.notes && (
        <p className="text-[10px] text-gray-400 mt-2 line-clamp-1 italic">
          {match.notes.slice(0, 50)}{match.notes.length > 50 ? '…' : ''}
        </p>
      )}
    </div>
  )
}

// ── Draggable card ─────────────────────────────────────────────────────────────

function DraggableCard({ match, plan, onOpen, dragOccurred }: {
  match: AppMatch
  plan: string
  onOpen: (m: AppMatch) => void
  dragOccurred: React.MutableRefObject<boolean>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: match.id })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? { ...style, opacity: 0.3 } : undefined}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (dragOccurred.current) return
        onOpen(match)
      }}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent match={match} plan={plan} />
    </div>
  )
}

// ── Droppable column ───────────────────────────────────────────────────────────

function DroppableColumn({ col, children, count, value }: {
  col: typeof COLUMNS[0]
  children: React.ReactNode
  count: number
  value: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[220px] sm:w-60 rounded-[14px] border snap-start ${col.border} ${col.bg} p-3 transition-all ${
        isOver ? 'ring-2 ring-[#0F4C35] shadow-lg scale-[1.01]' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className={`font-semibold text-sm ${col.color} flex items-center gap-1.5`}>
          {col.label}
        </h3>
        <span className="text-xs font-bold bg-white/80 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {value > 0 && (
        <p className="text-xs text-gray-400 mb-2">£{value.toLocaleString()}</p>
      )}

      {/* Cards */}
      <div className="space-y-2 min-h-[80px]">
        {children}
        {count === 0 && (
          <div className="h-20 rounded-xl border-2 border-dashed border-gray-200/70 flex flex-col items-center justify-center gap-1 px-3">
            <p className="text-[10px] text-gray-300 text-center leading-snug">{col.empty}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  setTimeout(onDone, 2500)
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl z-50">
      {message}
    </div>
  )
}

// ── Main board ─────────────────────────────────────────────────────────────────

interface Props {
  matches: AppMatch[]
  plan: string
}

export default function PipelineBoard({ matches: initial, plan }: Props) {
  const [matches, setMatches]     = useState<AppMatch[]>(initial)
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [selected, setSelected]   = useState<AppMatch | null>(null)
  const [toast, setToast]         = useState<string | null>(null)
  const dragOccurred              = useRef(false)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  // Gate non-paid users
  if (plan === 'free') {
    return (
      <div className="card max-w-md mx-auto text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-2">Pipeline is a Starter feature</h3>
        <p className="text-gray-400 text-sm mb-6">
          Track your grant applications on a visual kanban board with drag-and-drop columns, notes, deadlines, and email reminders.
        </p>
        <Link href="/pricing" className="inline-block bg-[#0F4C35] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#0c3d2a] transition-colors">
          Upgrade — from £9/mo
        </Link>
      </div>
    )
  }

  const colMatches   = useCallback((col: MatchStatus) => matches.filter(m => m.status === col), [matches])
  const activeMatch  = activeId ? matches.find(m => m.id === activeId) ?? null : null

  // Stats
  const totalTracked = matches.length
  const totalValue   = matches.reduce((s, m) => s + ((m.amount_requested ?? m.grant.max_award) || 0), 0)
  const wonMatches   = matches.filter(m => m.status === 'won')
  const wonValue     = wonMatches.reduce((s, m) => s + ((m.amount_requested ?? m.grant.max_award) || 0), 0)
  const submitted    = matches.filter(m => ['submitted', 'won', 'lost'].includes(m.status)).length
  const successRate  = submitted > 0 ? Math.round((wonMatches.length / submitted) * 100) : 0

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    dragOccurred.current = true
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setTimeout(() => { dragOccurred.current = false }, 100)

    if (!over) return
    const matchId  = active.id as string
    const newStatus = over.id as MatchStatus
    const match    = matches.find(m => m.id === matchId)
    if (!match || match.status === newStatus) return

    const colLabel = COLUMNS.find(c => c.id === newStatus)?.label ?? newStatus
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m))
    setToast(`Moved to ${colLabel}`)

    // Persist via API (includes activity log append)
    await fetch(`/api/applications/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function handleSave(id: string, updates: Record<string, unknown>) {
    // Optimistic update
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updates } as AppMatch : prev)

    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  async function handleDelete(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
    setToast('Removed from pipeline')
    await fetch(`/api/applications/${id}`, { method: 'DELETE' })
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {selected && (
        <DetailPanel
          match={selected}
          plan={plan}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Tracked',      value: totalTracked.toString(),              icon: '📋' },
          { label: 'Total value',  value: `£${totalValue.toLocaleString()}`,    icon: '💷' },
          { label: 'Won',          value: `£${wonValue.toLocaleString()}`,      icon: '🏆', green: wonValue > 0 },
          { label: 'Success rate', value: `${successRate}%`,                    icon: '📊' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="card p-4 animate-scale-in"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="text-xl sm:text-2xl mb-1">{stat.icon}</div>
            <div className={`font-bold text-lg sm:text-xl truncate ${stat.green ? 'text-green-600' : 'text-[#0D1117]'}`}>{stat.value}</div>
            <div className="text-gray-400 text-[10px] sm:text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mobile scroll hint */}
      <div className="md:hidden flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
          <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Swipe to see all columns
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
          {COLUMNS.map((col, colIdx) => {
            const cards    = colMatches(col.id)
            const colValue = cards.reduce((s, m) => s + ((m.amount_requested ?? m.grant.max_award) || 0), 0)
            return (
              <div
                key={col.id}
                className="animate-fade-up flex-shrink-0"
                style={{ animationDelay: `${colIdx * 60}ms` }}
              >
                <DroppableColumn col={col} count={cards.length} value={colValue}>
                  {cards.map(m => (
                    <DraggableCard
                      key={m.id}
                      match={m}
                      plan={plan}
                      onOpen={setSelected}
                      dragOccurred={dragOccurred}
                    />
                  ))}
                </DroppableColumn>
              </div>
            )
          })}
        </div>

        {/* Ghost card shown while dragging */}
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeMatch && <CardContent match={activeMatch} plan={plan} overlay />}
        </DragOverlay>
      </DndContext>

      {matches.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="font-display text-lg font-semibold text-[#0D1117] mb-2">No applications yet</h3>
          <p className="text-gray-400 text-sm mb-5">Head to your dashboard and click "Track" on any matched grant to add it here.</p>
          <Link href="/dashboard" className="inline-block bg-[#0F4C35] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0c3d2a] transition-colors">
            Go to dashboard →
          </Link>
        </div>
      )}
    </>
  )
}
