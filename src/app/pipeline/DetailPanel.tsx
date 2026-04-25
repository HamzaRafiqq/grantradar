'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { canSeeFunderName, canSeeApplyLink } from '@/lib/plans'
import { daysUntil, scoreColor } from '@/lib/utils'

const STATUS_OPTIONS: { value: MatchStatus; label: string; color: string }[] = [
  { value: 'new',         label: '🔖 Saved',       color: 'text-gray-600' },
  { value: 'researching', label: '📚 Researching',  color: 'text-blue-600' },
  { value: 'applying',    label: '✍️ Applying',     color: 'text-amber-600' },
  { value: 'submitted',   label: '📤 Submitted',    color: 'text-purple-600' },
  { value: 'won',         label: '🏆 Won',          color: 'text-green-600' },
  { value: 'lost',        label: '❌ Lost',          color: 'text-red-600' },
]

interface ActivityEntry {
  action: string
  from?: string
  to?: string
  note?: string
  timestamp: string
}

export type DetailMatch = GrantMatchWithGrant & {
  amount_requested?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity_log?: any[]
  deadline_set?: string | null
}

interface Props {
  match: DetailMatch
  plan: string
  onClose: () => void
  onSave: (id: string, updates: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export default function DetailPanel({ match, plan, onClose, onSave, onDelete }: Props) {
  const [status, setStatus]           = useState<MatchStatus>(match.status as MatchStatus)
  const [notes, setNotes]             = useState(match.notes ?? '')
  const [amountReq, setAmountReq]     = useState(match.amount_requested ?? match.grant.max_award ?? 0)
  const [deadlineSet, setDeadlineSet] = useState(match.deadline_set ?? match.grant.deadline ?? '')
  const [saving, setSaving]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showFunder   = canSeeFunderName(plan)
  const showApply    = canSeeApplyLink(plan)
  const days         = daysUntil(deadlineSet || match.grant.deadline)
  const activityLog: ActivityEntry[] = Array.isArray(match.activity_log) ? match.activity_log : []

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleStatusChange(newStatus: MatchStatus) {
    setStatus(newStatus)
    await saveField({ status: newStatus })
  }

  async function saveField(fields: Record<string, unknown>) {
    setSaving(true)
    await onSave(match.id, fields)
    setSaving(false)
  }

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveField({ notes: val }), 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function deadlineColor(d: number) {
    if (d <= 0)  return 'text-gray-400'
    if (d <= 2)  return 'text-red-600 font-bold'
    if (d <= 7)  return 'text-orange-500 font-semibold'
    if (d <= 30) return 'text-amber-600'
    return 'text-green-600'
  }

  function deadlineLabel(d: number) {
    if (d <= 0) return 'Overdue'
    if (d === 1) return '1 day left'
    return `${d} days left`
  }

  function formatActivityAction(entry: ActivityEntry) {
    if (entry.action === 'created') return 'Added to pipeline'
    if (entry.action === 'status_changed') {
      const fromLabel = STATUS_OPTIONS.find(o => o.value === entry.from)?.label ?? entry.from
      const toLabel = STATUS_OPTIONS.find(o => o.value === entry.to)?.label ?? entry.to
      return `Moved from ${fromLabel} → ${toLabel}`
    }
    return entry.note ?? entry.action
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-[#0D1117] text-base leading-snug line-clamp-2">
              {showFunder ? match.grant.name : (match.grant.public_title ?? match.grant.name)}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {showFunder ? match.grant.funder : (match.grant.funder_type ?? 'UK Funder')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && <span className="text-[10px] text-gray-400">Saving…</span>}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(match.eligibility_score)}`}>
              {match.eligibility_score}/10
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status + deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value as MatchStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Deadline
                {days > 0 && (
                  <span className={`ml-2 normal-case font-normal ${deadlineColor(days)}`}>
                    {deadlineLabel(days)}
                  </span>
                )}
                {days <= 0 && deadlineSet && <span className="ml-2 normal-case font-normal text-gray-400">Overdue</span>}
              </label>
              <input
                type="date"
                value={deadlineSet || ''}
                onChange={e => {
                  setDeadlineSet(e.target.value)
                  saveField({ deadline_set: e.target.value || null })
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
              />
            </div>
          </div>

          {/* Amount requested */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Amount Requested (£)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
              <input
                type="number"
                value={amountReq || ''}
                onChange={e => setAmountReq(Number(e.target.value))}
                onBlur={() => saveField({ amount_requested: amountReq || null })}
                placeholder={match.grant.max_award ? match.grant.max_award.toLocaleString() : '0'}
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
              />
            </div>
            {match.grant.max_award > 0 && (
              <p className="text-xs text-gray-400 mt-1">Grant max: £{match.grant.max_award.toLocaleString()}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Add notes about this application — contacts made, eligibility details, next steps…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white resize-none leading-relaxed"
            />
          </div>

          {/* Apply link */}
          {showApply && match.grant.application_url && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Application Link</label>
              <a
                href={match.grant.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#0F4C35] font-medium hover:underline"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13h8A1.5 1.5 0 0012 11.5V9M9 1h4m0 0v4m0-4L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Apply on funder website →
              </a>
            </div>
          )}
          {!showApply && (
            <div className="bg-[#F4F6F5] rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">🔒 Upgrade to Starter to see the application link</p>
            </div>
          )}

          {/* Why you match */}
          {match.match_reason && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Why You Match</label>
              <p className="text-sm text-gray-600 leading-relaxed bg-[#F4F6F5] rounded-xl px-3 py-2.5">{match.match_reason}</p>
            </div>
          )}

          {/* Activity log */}
          {activityLog.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Activity</label>
              <div className="space-y-3">
                {[...activityLog].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#0F4C35] mt-0.5" />
                      {i < activityLog.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-gray-700 font-medium">{formatActivityAction(entry)}</p>
                      <p className="text-gray-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-red-600 font-medium flex-1">Remove from pipeline?</span>
              <button
                onClick={() => { onDelete(match.id); onClose() }}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M6 6.5v4M8 6.5v4M3 3.5l.7 7.5a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Remove
              </button>
              <button
                onClick={onClose}
                className="text-xs font-semibold text-white bg-[#0F4C35] hover:bg-[#0c3d2a] px-4 py-2 rounded-xl transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
