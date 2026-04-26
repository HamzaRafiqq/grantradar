'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FunderShell from '../../FunderShell'

// ── Constants ──────────────────────────────────────────────────────────────

const CAUSE_AREAS = [
  'Arts & Culture', 'Children & Youth', 'Community Development', 'Disability',
  'Education', 'Environment', 'Health & Wellbeing', 'Homelessness', 'Mental Health',
  'Older People', 'Poverty & Inequality', 'Sport & Recreation', 'Wildlife & Nature',
]

const ORG_TYPES = [
  'Registered Charity', 'CIO', 'CIC', 'Community Group',
  'Social Enterprise', 'School / University', 'NHS Body', 'Local Authority',
]

const GEO_OPTIONS = [
  { value: 'uk_wide',  label: 'UK-wide' },
  { value: 'england',  label: 'England only' },
  { value: 'scotland', label: 'Scotland only' },
  { value: 'wales',    label: 'Wales only' },
  { value: 'ni',       label: 'Northern Ireland only' },
  { value: 'london',   label: 'Greater London' },
  { value: 'regional', label: 'Specific regions' },
]

const REQ_DOCS = [
  'Latest annual accounts', 'Governing document', 'Safeguarding policy',
  'Project budget', 'Bank statement', 'Evidence of need', 'Letters of support',
]

interface Question { question: string; type: 'text' | 'number' | 'file'; required: boolean }

// ── Component ──────────────────────────────────────────────────────────────

export default function CreateGrantPage() {
  const router = useRouter()

  // Form state
  const [step, setStep]         = useState(1)
  const [saving, setSaving]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError]       = useState('')
  const [savedId, setSavedId]   = useState<string | null>(null)

  // Step 1 — Basic info
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [totalPot, setTotalPot] = useState('')
  const [minGrant, setMinGrant] = useState('')
  const [maxGrant, setMaxGrant] = useState('')

  // Step 2 — Timeline
  const [openDate, setOpenDate]       = useState('')
  const [deadline, setDeadline]       = useState('')
  const [decisionDate, setDecision]   = useState('')

  // Step 3 — Eligibility
  const [causeAreas, setCauses]         = useState<string[]>([])
  const [geoFocus, setGeo]              = useState('uk_wide')
  const [orgTypesAllowed, setOrgTypes]  = useState<string[]>([])
  const [yearsMin, setYearsMin]         = useState('0')
  const [additionalCriteria, setAddl]   = useState('')
  const [requiredDocs, setReqDocs]      = useState<string[]>([])

  // Step 4 — Questions
  const [questions, setQuestions] = useState<Question[]>([
    { question: "Describe your project and how it will benefit your community.", type: 'text', required: true },
    { question: "What outcomes will you achieve with this funding?", type: 'text', required: true },
    { question: "How will you measure your impact?", type: 'text', required: true },
  ])

  function addQuestion() {
    setQuestions(prev => [...prev, { question: '', type: 'text', required: true }])
  }

  function updateQuestion(idx: number, field: keyof Question, value: string | boolean) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleCause(c: string) {
    setCauses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function toggleOrgType(t: string) {
    setOrgTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function toggleDoc(d: string) {
    setReqDocs(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function buildPayload(status: 'draft' | 'open') {
    return {
      title: title.trim(),
      description: description.trim(),
      total_pot:  totalPot  ? parseInt(totalPot)  : null,
      min_grant:  minGrant  ? parseInt(minGrant)  : null,
      max_grant:  maxGrant  ? parseInt(maxGrant)  : null,
      open_date:     openDate     || null,
      deadline:      deadline     || null,
      decision_date: decisionDate || null,
      cause_areas:      causeAreas,
      geographic_focus: geoFocus,
      org_types_allowed: orgTypesAllowed,
      years_operating_min: parseInt(yearsMin) || 0,
      additional_criteria: additionalCriteria.trim() || null,
      required_documents: requiredDocs,
      status,
      questions: questions.filter(q => q.question.trim()),
    }
  }

  async function save(status: 'draft' | 'open') {
    if (!title.trim()) { setError('Grant title is required'); return null }
    if (status === 'open' && !deadline) { setError('Deadline is required to publish'); return null }

    setError('')
    const payload = buildPayload(status)

    if (savedId) {
      // Update existing
      const res = await fetch(`/api/funder/grants/${savedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return null }
      return savedId
    } else {
      const res = await fetch('/api/funder/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return null }
      setSavedId(data.grant.id)
      return data.grant.id
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    const id = await save('draft')
    setSaving(false)
    if (id) router.push('/funder/grants')
  }

  async function handlePublish() {
    setPublishing(true)
    const id = await save('draft')
    if (!id) { setPublishing(false); return }

    // Publish
    const res = await fetch(`/api/funder/grants/${id}/publish`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Publish failed'); setPublishing(false); return }
    setPublishing(false)
    router.push('/funder/grants')
  }

  const STEPS = ['Basic info', 'Timeline', 'Eligibility', 'Questions', 'Review']

  return (
    <FunderShell>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/funder/grants" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-display font-bold text-[#0D1117] text-xl">Post a new grant</h1>
            <p className="text-gray-500 text-sm">Publish to be matched with eligible charities.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  i + 1 === step
                    ? 'bg-[#0F2B4C] text-white'
                    : i + 1 < step
                    ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                  {i + 1 < step ? '✓' : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* ── STEP 1: Basic info ────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-[#0D1117] text-lg mb-4">Grant details</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Grant title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Community Resilience Fund 2025"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  className="input w-full resize-none leading-relaxed"
                  placeholder="Describe the purpose of this grant, what you're looking to fund, and what makes a strong application…"
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total pot (£)</label>
                  <input type="number" className="input w-full" placeholder="500000" value={totalPot} onChange={e => setTotalPot(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min grant (£)</label>
                  <input type="number" className="input w-full" placeholder="5000" value={minGrant} onChange={e => setMinGrant(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max grant (£)</label>
                  <input type="number" className="input w-full" placeholder="50000" value={maxGrant} onChange={e => setMaxGrant(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Timeline ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-[#0D1117] text-lg mb-4">Timeline</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Open date</label>
                  <input type="date" className="input w-full" value={openDate} onChange={e => setOpenDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Application deadline <span className="text-red-500">*</span>
                  </label>
                  <input type="date" className="input w-full" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Decision date</label>
                  <input type="date" className="input w-full" value={decisionDate} onChange={e => setDecision(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Eligibility ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-[#0D1117] text-lg mb-4">Eligibility criteria</h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cause areas <span className="text-gray-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CAUSE_AREAS.map(c => (
                    <button key={c} type="button" onClick={() => toggleCause(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        causeAreas.includes(c) ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Geographic focus</label>
                <select className="input w-full" value={geoFocus} onChange={e => setGeo(e.target.value)}>
                  {GEO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organisation types eligible <span className="text-gray-400 font-normal">(leave blank for all)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ORG_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => toggleOrgType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        orgTypesAllowed.includes(t) ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Minimum years operating
                </label>
                <input type="number" min="0" max="50" className="input w-32" value={yearsMin} onChange={e => setYearsMin(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Required documents <span className="text-gray-400 font-normal">(applicants must submit these)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REQ_DOCS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDoc(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        requiredDocs.includes(d) ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>{d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional criteria</label>
                <textarea rows={3} className="input w-full resize-none" placeholder="Any other eligibility requirements…"
                  value={additionalCriteria} onChange={e => setAddl(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── STEP 4: Questions ─────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-[#0D1117] text-lg">Application questions</h2>
                <button onClick={addQuestion}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2B4C] hover:underline">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  Add question
                </button>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0F2B4C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="input w-full text-sm"
                          placeholder="Enter your question…"
                          value={q.question}
                          onChange={e => updateQuestion(idx, 'question', e.target.value)}
                        />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium">Type:</label>
                            <select
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                              value={q.type}
                              onChange={e => updateQuestion(idx, 'type', e.target.value)}
                            >
                              <option value="text">Text answer</option>
                              <option value="number">Number</option>
                              <option value="file">File upload</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={e => updateQuestion(idx, 'required', e.target.checked)}
                              className="rounded"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      {questions.length > 1 && (
                        <button onClick={() => removeQuestion(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addQuestion}
                className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
                + Add another question
              </button>
            </div>
          )}

          {/* ── STEP 5: Review ────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-display font-bold text-[#0D1117] text-lg mb-4">Review & publish</h2>

              <div className="space-y-3">
                {[
                  { label: 'Grant title', value: title || <span className="text-red-400">Missing</span> },
                  { label: 'Total pot', value: totalPot ? `£${parseInt(totalPot).toLocaleString()}` : '—' },
                  { label: 'Max grant', value: maxGrant ? `£${parseInt(maxGrant).toLocaleString()}` : '—' },
                  { label: 'Deadline', value: deadline ? new Date(deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-red-400">Missing — required to publish</span> },
                  { label: 'Cause areas', value: causeAreas.length > 0 ? causeAreas.join(', ') : 'Any' },
                  { label: 'Geographic focus', value: GEO_OPTIONS.find(g => g.value === geoFocus)?.label },
                  { label: 'Questions', value: `${questions.filter(q => q.question.trim()).length} question${questions.filter(q => q.question.trim()).length !== 1 ? 's' : ''}` },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-px">{row.label}</span>
                    <span className="text-sm text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <strong>When you publish:</strong> FundsRadar will match this grant to eligible charities and send them an alert email. They can then apply directly through the platform.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <div>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>

            {step < 5 ? (
              <button
                onClick={() => {
                  if (step === 1 && !title.trim()) { setError('Grant title is required'); return }
                  setError('')
                  setStep(s => s + 1)
                }}
                className="bg-[#0F2B4C] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#0a1f38] transition-colors flex items-center gap-2"
              >
                Next
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-green-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {publishing ? 'Publishing…' : '🚀 Publish grant'}
              </button>
            )}
          </div>
        </div>
      </div>
    </FunderShell>
  )
}
