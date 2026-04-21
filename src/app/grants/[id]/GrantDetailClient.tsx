'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { MatchStatus } from '@/types'

interface Props {
  grantId: string
  matchId?: string
  matchStatus?: string
  matchNotes: string
  isPro: boolean
}

const statusOptions: { value: MatchStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'researching', label: 'Researching' },
  { value: 'applying', label: 'Applying' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

export default function GrantDetailClient({ grantId, matchId, matchStatus, matchNotes, isPro }: Props) {
  const [draft, setDraft] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [status, setStatus] = useState(matchStatus ?? 'new')
  const [notes, setNotes] = useState(matchNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function generateDraft() {
    if (!isPro) return
    setDrafting(true)
    const res = await fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grantId }),
    })
    const data = await res.json()
    setDraft(data.draft ?? '')
    setDrafting(false)
  }

  async function saveNotes() {
    if (!matchId) return
    setSaving(true)
    await supabase
      .from('grant_matches')
      .update({ notes, status })
      .eq('id', matchId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function updateStatus(newStatus: MatchStatus) {
    setStatus(newStatus)
    if (!matchId) return
    await supabase.from('grant_matches').update({ status: newStatus }).eq('id', matchId)
  }

  return (
    <>
      {/* Status tracker */}
      {matchId && (
        <div className="card mb-5">
          <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-4">Application tracker</h2>
          <div className="flex gap-2 flex-wrap mb-4">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateStatus(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === opt.value
                    ? 'bg-[#0F4C35] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              rows={4}
              className="input resize-none"
              placeholder="Add your notes about this application..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            onClick={saveNotes}
            disabled={saving}
            className="btn-primary text-sm py-2 mt-3 disabled:opacity-60"
          >
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save notes'}
          </button>
        </div>
      )}

      {/* AI Draft */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0D1117]">AI Application Draft</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Generate a tailored opening paragraph for this application.
            </p>
          </div>
          {isPro && (
            <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-2 py-1 rounded-full">PRO</span>
          )}
        </div>

        {!isPro ? (
          <div className="bg-[#F4F6F5] rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">✍️</div>
            <h3 className="font-semibold text-[#0D1117] mb-2">Pro feature</h3>
            <p className="text-gray-400 text-sm mb-4">
              Upgrade to Pro to generate AI-written application drafts tailored to each grant's criteria.
            </p>
            <Link href="/pricing" className="btn-primary text-sm py-2.5 justify-center">
              Upgrade to Pro — £49/mo
            </Link>
          </div>
        ) : (
          <>
            {draft ? (
              <div>
                <textarea
                  rows={8}
                  className="input resize-none font-body text-sm leading-relaxed mb-3"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={generateDraft} disabled={drafting} className="btn-secondary text-sm py-2">
                    Regenerate
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(draft)}
                    className="btn-primary text-sm py-2"
                  >
                    Copy to clipboard
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generateDraft}
                disabled={drafting}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
              >
                {drafting ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                    </svg>
                    Writing your draft...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 15V11L11 3l4 4-8 8H3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
                      <path d="M9 5l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                    </svg>
                    Draft My Application
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
