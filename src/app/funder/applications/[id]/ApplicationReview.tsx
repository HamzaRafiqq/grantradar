'use client'

import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'received',     label: '📥 Received',      color: 'text-blue-600'   },
  { value: 'under_review', label: '🔍 Under Review',  color: 'text-amber-600'  },
  { value: 'shortlisted',  label: '⭐ Shortlisted',   color: 'text-purple-600' },
  { value: 'awarded',      label: '🏆 Awarded',       color: 'text-green-600'  },
  { value: 'declined',     label: '❌ Declined',       color: 'text-red-600'    },
  { value: 'waitlisted',   label: '⏳ Waitlisted',    color: 'text-gray-600'   },
]

const STATUS_BG: Record<string, string> = {
  received:     'bg-blue-50 text-blue-700 border-blue-200',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200',
  shortlisted:  'bg-purple-50 text-purple-700 border-purple-200',
  awarded:      'bg-green-50 text-green-700 border-green-200',
  declined:     'bg-red-50 text-red-600 border-red-200',
  waitlisted:   'bg-gray-50 text-gray-600 border-gray-200',
}

interface TrustHistory {
  total_score: number
  governance_score: number
  financial_score: number
  document_score: number
  track_record_score: number
  application_score: number
}

interface Answer {
  id: string
  answer_text: string | null
  answer_number: number | null
  question: { question: string; type: string }
}

interface Org {
  name: string
  charity_number?: string
  website?: string
  location?: string
  annual_income?: string
  trust_score: number
  nonprofit_type?: string
}

interface Application {
  id: string
  status: string
  amount_requested: number | null
  submitted_at: string
  funder_notes: string | null
  grant: { title: string; max_grant: number | null }
  org: Org
}

interface Props {
  application: Application
  answers:     Answer[]
  trustHistory: TrustHistory | null
}

const INCOME_LABELS: Record<string, string> = {
  under_100k: 'Under £100k',
  '100k_500k': '£100k – £500k',
  over_500k: 'Over £500k',
}

const CATEGORY_LABELS = ['Governance', 'Financial', 'Documents', 'Track Record', 'Application Quality']
const CATEGORY_KEYS: (keyof TrustHistory)[] = [
  'governance_score', 'financial_score', 'document_score', 'track_record_score', 'application_score'
]

function trustScoreColor(score: number) {
  if (score >= 70) return { text: 'text-green-600', bg: 'bg-green-600', ring: '#16A34A' }
  if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: '#D97706' }
  return { text: 'text-red-600', bg: 'bg-red-500', ring: '#DC2626' }
}

export default function ApplicationReview({ application, answers, trustHistory }: Props) {
  const [status, setStatus]   = useState(application.status)
  const [notes, setNotes]     = useState(application.funder_notes ?? '')
  const [saving, setSaving]   = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  const [showLetterModal, setShowLetterModal]   = useState(false)
  const [letterType, setLetterType]             = useState<'award' | 'decline'>('award')
  const [generatingLetter, setGeneratingLetter] = useState(false)
  const [letterText, setLetterText]             = useState('')
  const [copied, setCopied]                     = useState(false)

  async function updateStatus(newStatus: string) {
    setStatus(newStatus)
    setSaving(true)
    await fetch(`/api/funder/applications/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
  }

  async function saveNotes() {
    setSaving(true)
    await fetch(`/api/funder/applications/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funder_notes: notes }),
    })
    setSaving(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  async function generateLetter(type: 'award' | 'decline') {
    setLetterType(type)
    setShowLetterModal(true)
    setGeneratingLetter(true)
    setLetterText('')
    const res = await fetch(`/api/funder/applications/${application.id}/letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    const data = await res.json()
    setLetterText(data.letter ?? 'Failed to generate letter. Please try again.')
    setGeneratingLetter(false)
  }

  function copyLetter() {
    navigator.clipboard.writeText(letterText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const org   = application.org
  const trust = trustHistory
  const tc    = trustScoreColor(org.trust_score)
  const CIRCUM = 2 * Math.PI * 32

  return (
    <div className="space-y-6">
      {/* Status + quick actions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Application for</p>
            <h2 className="font-display font-bold text-[#0D1117] text-base truncate">{application.grant.title}</h2>
            {application.amount_requested && (
              <p className="text-sm text-gray-600 mt-0.5">Requesting £{application.amount_requested.toLocaleString()}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-gray-400">Saving…</span>}
            <select
              value={status}
              onChange={e => updateStatus(e.target.value)}
              className={`text-xs font-bold border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20 ${STATUS_BG[status]}`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Decision letter buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => generateLetter('award')}
            className="flex items-center gap-2 text-xs font-semibold bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
          >
            ✦ Generate Award Letter
          </button>
          <button
            onClick={() => generateLetter('decline')}
            className="flex items-center gap-2 text-xs font-semibold bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            ✦ Generate Decline Letter
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charity info + Trust Score */}
        <div className="space-y-5">
          {/* Charity info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Applicant</h3>
            <p className="font-display font-bold text-[#0D1117] text-base">{org.name}</p>
            {org.charity_number && (
              <p className="text-xs text-gray-500 mt-1">Reg. {org.charity_number}</p>
            )}
            {org.location && (
              <p className="text-xs text-gray-500 mt-0.5">📍 {org.location}</p>
            )}
            {org.annual_income && (
              <p className="text-xs text-gray-500 mt-0.5">
                💰 {INCOME_LABELS[org.annual_income] ?? org.annual_income}
              </p>
            )}
            {org.nonprofit_type && (
              <p className="text-xs text-gray-500 mt-0.5">🏛 {org.nonprofit_type}</p>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 block truncate">
                {org.website}
              </a>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Submitted {new Date(application.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Trust Score */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Trust Score</h3>
            <div className="flex items-center gap-4 mb-5">
              <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
                <circle cx="36" cy="36" r="32" fill="none" stroke="#f0f0f0" strokeWidth="7"/>
                <circle cx="36" cy="36" r="32" fill="none" stroke={tc.ring} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUM}
                  strokeDashoffset={CIRCUM - (org.trust_score / 100) * CIRCUM}
                  transform="rotate(-90 36 36)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="36" y="33" textAnchor="middle" fontSize="18" fontWeight="700" fill={tc.ring}>{org.trust_score}</text>
                <text x="36" y="47" textAnchor="middle" fontSize="9" fill="#9ca3af">/100</text>
              </svg>
              <div>
                <p className={`font-bold text-base ${tc.text}`}>
                  {org.trust_score >= 70 ? 'Strong' : org.trust_score >= 40 ? 'Developing' : 'Early stage'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">FundsRadar Trust Score</p>
              </div>
            </div>

            {trust && (
              <div className="space-y-2.5">
                {CATEGORY_LABELS.map((label, i) => {
                  const val = trust[CATEGORY_KEYS[i]] as number
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{label}</span>
                        <span className="text-xs font-semibold text-gray-800">{val}/20</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(val / 20) * 100}%`, backgroundColor: tc.ring }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!trust && <p className="text-xs text-gray-400 mt-2">No Trust Score recorded yet.</p>}
          </div>
        </div>

        {/* Right: Answers + Notes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Application answers */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Application answers
            </h3>
            {answers.length === 0 ? (
              <p className="text-sm text-gray-400">No answers submitted yet.</p>
            ) : (
              <div className="space-y-5">
                {answers.map((a, idx) => (
                  <div key={a.id}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                      Q{idx + 1}. {a.question?.question}
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {a.answer_text || (a.answer_number !== null ? String(a.answer_number) : <span className="text-gray-400 italic">No answer</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal notes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Internal notes <span className="text-gray-300 font-normal">(private, funder only)</span>
              </h3>
              {noteSaved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20 resize-none leading-relaxed placeholder:text-gray-300"
              placeholder="Add private notes about this application — committee comments, risk flags, follow-up actions…"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 text-xs font-semibold text-[#0F2B4C] hover:underline disabled:text-gray-400"
            >
              Save notes
            </button>
          </div>
        </div>
      </div>

      {/* ── Decision Letter Modal ──────────────────────────────────── */}
      {showLetterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !generatingLetter && setShowLetterModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-display font-bold text-[#0D1117]">
                  {letterType === 'award' ? '🏆 Award Letter' : '📄 Decline Letter'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">AI-generated draft — review before sending</p>
              </div>
              <button onClick={() => setShowLetterModal(false)} className="text-gray-400 hover:text-gray-700">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {generatingLetter ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-[3px] border-[#0F2B4C] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Drafting your letter…</p>
                </div>
              ) : (
                <textarea
                  value={letterText}
                  onChange={e => setLetterText(e.target.value)}
                  className="w-full h-96 text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20 resize-none font-mono"
                />
              )}
            </div>

            {!generatingLetter && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">Edit the letter above before copying or sending.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateLetter(letterType)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={copyLetter}
                    className="text-xs font-semibold bg-[#0F2B4C] text-white px-4 py-2 rounded-xl hover:bg-[#0a1f38] transition-colors"
                  >
                    {copied ? 'Copied! ✓' : 'Copy letter'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
