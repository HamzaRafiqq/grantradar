'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────

interface Question {
  id:          string
  text:        string
  answer:      string
  targetWords: number
  aiScore:     number | null
}

interface ScoreResult {
  score:        number
  strengths:    string[]
  weaknesses:   string[]
  improvements: string[]
}

interface QualityResult {
  overallScore:  number
  improvements:  string[]
  readyToSubmit: boolean
}

export interface Grant {
  id:               string
  name:             string
  funder_name?:     string | null
  description?:     string | null
  max_award?:       number | null
  deadline?:        string | null
}

export interface AppMatch {
  id:               string
  grant:            Grant
  status:           string
  amount_requested?: number | null
}

export interface CharityProfile {
  name:             string
  beneficiaries?:   string | null
  current_projects?: string | null
  annual_income?:   string | null
  sector?:          string | null
  location?:        string | null
}

interface Props {
  match:          AppMatch
  profile:        CharityProfile
  plan:           string
  initialAnswers: { question: string; answer: string; ai_score: number | null }[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_QUESTIONS = [
  { text: "What is your organisation's mission and the communities you serve?",   targetWords: 150 },
  { text: "What problem does this project address and how many people are affected?", targetWords: 200 },
  { text: "What activities will you carry out with this funding?",                targetWords: 250 },
  { text: "What outcomes do you aim to achieve and how will you measure them?",   targetWords: 200 },
  { text: "How does this project align with the funder's priorities?",            targetWords: 200 },
]

const COMMON_QUESTIONS = [
  "How will you ensure the project is sustainable beyond this grant?",
  "What is your total project budget and how will the grant be spent?",
  "Who are your beneficiaries and how have you involved them?",
  "What risks have you identified and how will you manage them?",
  "What is your track record in delivering similar projects?",
  "Describe your organisation's governance and financial management.",
]

const COMMANDS = [
  { id: 'shorter',      label: 'Make shorter',          desc: 'Reduce by ~30% keeping all key points',    icon: '✂️' },
  { id: 'specific',     label: 'Make more specific',     desc: 'Add concrete details and numbers',         icon: '🎯' },
  { id: 'impact',       label: 'Add impact evidence',    desc: 'Weave in outcomes and beneficiary data',   icon: '📊' },
  { id: 'opening',      label: 'Improve opening',        desc: 'Rewrite the first sentence',               icon: '✨' },
  { id: 'beneficiary',  label: 'Add beneficiary story',  desc: 'Generate a realistic illustrative example', icon: '👥' },
]

const REQUIRED_DOCS = [
  'Latest annual accounts',
  'Governing document / constitution',
  'Safeguarding policy',
  'Project budget breakdown',
  'Bank statement (last 3 months)',
]

const INCOME_LABELS: Record<string, string> = {
  under_100k: 'Under £100k',
  '100k_500k': '£100k – £500k',
  over_500k: 'Over £500k',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function uid() { return Math.random().toString(36).slice(2) }

function tryPrefill(questionText: string, profile: CharityProfile): string {
  const lower = questionText.toLowerCase()
  if (lower.includes('mission') || lower.includes('main activit'))
    return profile.beneficiaries ?? profile.current_projects ?? ''
  if (lower.includes('annual income') || lower.includes('financial situation'))
    return INCOME_LABELS[profile.annual_income ?? '']
      ? `Our annual income is ${INCOME_LABELS[profile.annual_income!].toLowerCase()}.`
      : ''
  if (lower.includes('beneficiar') || lower.includes('who do you serve'))
    return profile.beneficiaries ?? ''
  if (lower.includes('current project') || lower.includes('activit') || lower.includes('what do you do'))
    return profile.current_projects ?? ''
  return ''
}

function scoreRingColor(score: number) {
  if (score >= 8) return '#16A34A'
  if (score >= 6) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(score: number) {
  if (score >= 8) return 'Excellent'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'Developing'
  return 'Needs work'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function WriteClient({ match, profile, plan: _plan, initialAnswers }: Props) {

  // Initialise questions from defaults, pre-filled where possible + saved answers
  const [questions, setQuestions] = useState<Question[]>(() =>
    DEFAULT_QUESTIONS.map(q => {
      const saved = initialAnswers.find(a => a.question === q.text)
      return {
        id:          uid(),
        text:        q.text,
        targetWords: q.targetWords,
        answer:      saved?.answer ?? tryPrefill(q.text, profile),
        aiScore:     saved?.ai_score ?? null,
      }
    }),
  )

  const [activeIdx,        setActiveIdx]       = useState(0)
  const [ghostText,        setGhostText]       = useState('')
  const [isGenerating,     setIsGenerating]    = useState(false)
  const [scoreResult,      setScoreResult]     = useState<ScoreResult | null>(null)
  const [isScoring,        setIsScoring]       = useState(false)
  const [showCmdPalette,   setShowCmdPalette]  = useState(false)
  const [cmdQuery,         setCmdQuery]        = useState('')
  const [isExecuting,      setIsExecuting]     = useState(false)
  const [lastSaved,        setLastSaved]       = useState<Date | null>(null)
  const [showAddQ,         setShowAddQ]        = useState(false)
  const [newQText,         setNewQText]        = useState('')
  const [showCommon,       setShowCommon]      = useState(false)
  const [showQualityCheck, setShowQuality]     = useState(false)
  const [qualityResult,    setQualityResult]   = useState<QualityResult | null>(null)
  const [isCheckingQuality,setIsChecking]      = useState(false)
  const [expandCriteria,   setExpandCriteria]  = useState(false)

  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const ghostTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scoreTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer     = useRef<ReturnType<typeof setInterval> | null>(null)
  const addQRef       = useRef<HTMLDivElement>(null)

  const activeQ       = questions[activeIdx]
  const grantCriteria = match.grant.description ?? 'Support impactful UK charities'
  const showFunder    = ['starter', 'pro', 'agency'].includes(_plan)

  // ── Save ─────────────────────────────────────────────────────────────────

  const saveAnswer = useCallback(async (q: Question) => {
    if (!q.answer.trim()) return
    try {
      await fetch(`/api/applications/${match.id}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.text, answer: q.answer, ai_score: q.aiScore }),
      })
      setLastSaved(new Date())
    } catch { /* silent */ }
  }, [match.id])

  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (questions[activeIdx]) saveAnswer(questions[activeIdx])
    }, 30_000)
    return () => { if (saveTimer.current) clearInterval(saveTimer.current) }
  }, [questions, activeIdx, saveAnswer])

  // ── Click-outside to close Add Question dropdown ──────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addQRef.current && !addQRef.current.contains(e.target as Node)) {
        setShowAddQ(false)
        setShowCommon(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Keyboard shortcuts (CMD+K, Escape) ───────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowCmdPalette(false)
        setShowQuality(false)
        setShowAddQ(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Switch question (save first) ─────────────────────────────────────

  const switchQuestion = (idx: number) => {
    if (questions[activeIdx]) saveAnswer(questions[activeIdx])
    setActiveIdx(idx)
    setGhostText('')
    setScoreResult(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // ── Text change ───────────────────────────────────────────────────────

  const handleTextChange = (value: string) => {
    setQuestions(prev => prev.map((q, i) => i === activeIdx ? { ...q, answer: value } : q))
    setGhostText('')

    if (ghostTimer.current) clearTimeout(ghostTimer.current)
    if (value.trim().length > 20) {
      ghostTimer.current = setTimeout(() => generateGhost(value), 1000)
    }

    if (scoreTimer.current) clearTimeout(scoreTimer.current)
    if (value.trim().length > 50) {
      scoreTimer.current = setTimeout(() => triggerScore(value), 2000)
    }
  }

  // ── Ghost text ────────────────────────────────────────────────────────

  const generateGhost = async (currentText: string) => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQ.text,
          currentText,
          charityProfile: profile,
          grantCriteria,
        }),
      })
      const data = await res.json()
      if (data.suggestion) setGhostText(data.suggestion)
    } catch { /* silent */ }
    setIsGenerating(false)
  }

  const acceptGhost = () => {
    if (!ghostText) return
    const sep = activeQ.answer.endsWith(' ') ? '' : ' '
    const newText = activeQ.answer + sep + ghostText
    setQuestions(prev => prev.map((q, i) => i === activeIdx ? { ...q, answer: newText } : q))
    setGhostText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && ghostText) {
      e.preventDefault()
      acceptGhost()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setShowCmdPalette(true)
    }
  }

  // ── Scoring ───────────────────────────────────────────────────────────

  const triggerScore = async (text?: string) => {
    const answer = text ?? activeQ?.answer
    if (!answer?.trim() || isScoring) return
    setIsScoring(true)
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: activeQ.text, answer, grantCriteria, charityProfile: profile }),
      })
      const data = await res.json()
      if (data.result) {
        setScoreResult(data.result)
        setQuestions(prev => prev.map((q, i) => i === activeIdx ? { ...q, aiScore: data.result.score } : q))
      }
    } catch { /* silent */ }
    setIsScoring(false)
  }

  // ── CMD+K ─────────────────────────────────────────────────────────────

  const executeCommand = async (cmdId: string) => {
    if (!activeQ?.answer.trim() || isExecuting) return
    setIsExecuting(true)
    setShowCmdPalette(false)
    setCmdQuery('')
    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmdId,
          text: activeQ.answer,
          charityProfile: profile,
          grantCriteria,
          question: activeQ.text,
        }),
      })
      const data = await res.json()
      if (data.result) {
        setQuestions(prev => prev.map((q, i) => i === activeIdx ? { ...q, answer: data.result } : q))
        setGhostText('')
      }
    } catch { /* silent */ }
    setIsExecuting(false)
  }

  // ── Add / remove question ─────────────────────────────────────────────

  const addQuestion = (text: string) => {
    const prefill = tryPrefill(text, profile)
    const newQ: Question = { id: uid(), text, answer: prefill, targetWords: 200, aiScore: null }
    setQuestions(prev => [...prev, newQ])
    setActiveIdx(questions.length)
    setShowAddQ(false)
    setShowCommon(false)
    setNewQText('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const removeQuestion = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => Math.max(0, prev >= idx ? prev - 1 : prev))
  }

  // ── Quality check ─────────────────────────────────────────────────────

  const runQualityCheck = async () => {
    if (questions[activeIdx]) saveAnswer(questions[activeIdx])
    setIsChecking(true)
    setShowQuality(true)
    setQualityResult(null)
    try {
      const res = await fetch('/api/ai/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map(q => ({ question: q.text, answer: q.answer })),
          grantCriteria,
          charityProfile: profile,
        }),
      })
      const data = await res.json()
      if (data.result) setQualityResult(data.result)
    } catch { /* silent */ }
    setIsChecking(false)
  }

  // ── Derived values ────────────────────────────────────────────────────

  const filteredCmds = COMMANDS.filter(c =>
    !cmdQuery ||
    c.label.toLowerCase().includes(cmdQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(cmdQuery.toLowerCase()),
  )

  const wc       = wordCount(activeQ?.answer ?? '')
  const wcTarget = activeQ?.targetWords ?? 200
  const wcPct    = Math.min(100, (wc / wcTarget) * 100)
  const wcColor  = wc < wcTarget * 0.5 ? '#EF4444' : wc > wcTarget * 1.3 ? '#F59E0B' : '#16A34A'

  const CIRCUM    = 2 * Math.PI * 30
  const ringScore = scoreResult?.score ?? 0
  const ringOffset = CIRCUM - (ringScore / 10) * CIRCUM

  // Extract funder theme keywords from criteria text
  const themeKeywords = [...new Set(
    (match.grant.description ?? '')
      .toLowerCase()
      .match(/\b(community|wellbeing|impact|evidence|outcomes|sustainability|young people|mental health|environment|inclusion|diversity|equality|disadvantaged|vulnerable|innovation)\b/g) ?? [],
  )].slice(0, 7)

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#F4F6F5] overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 h-12 flex items-center gap-3 flex-shrink-0 z-10">
        <Link
          href="/pipeline"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Pipeline
        </Link>
        <span className="text-gray-300 select-none">/</span>
        <span className="text-sm text-gray-700 font-medium truncate max-w-xs">{match.grant.name}</span>
        {showFunder && match.grant.funder_name && (
          <>
            <span className="text-gray-300 select-none hidden sm:inline">/</span>
            <span className="text-sm text-gray-400 truncate hidden sm:inline">{match.grant.funder_name}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => { saveAnswer(activeQ); setLastSaved(new Date()) }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Save
          </button>
          <button
            onClick={runQualityCheck}
            className="text-xs bg-[#0F4C35] text-white px-3 py-1.5 rounded-lg hover:bg-[#0c3d2a] transition-colors font-semibold flex items-center gap-1.5"
          >
            <span>✦</span> Quality check
          </button>
        </div>
      </header>

      {/* ── 3-column body ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ══ LEFT PANEL ══════════════════════════════════════════════ */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">

          {/* Grant header */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Grant</p>
            <h2 className="font-display font-bold text-[#0D1117] text-sm leading-snug">{match.grant.name}</h2>
            {showFunder && match.grant.funder_name && (
              <p className="text-xs text-gray-500 mt-1">{match.grant.funder_name}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {match.grant.max_award && (
                <span className="text-xs font-semibold text-[#0F4C35] bg-green-50 px-2 py-0.5 rounded-full">
                  Up to £{match.grant.max_award.toLocaleString()}
                </span>
              )}
              {match.grant.deadline && (
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  {new Date(match.grant.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          {/* Grant criteria */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Grant Criteria</p>
            <p className={`text-xs text-gray-600 leading-relaxed ${expandCriteria ? '' : 'line-clamp-6'}`}>
              {match.grant.description ?? 'No criteria available for this grant.'}
            </p>
            {(match.grant.description?.length ?? 0) > 220 && (
              <button
                onClick={() => setExpandCriteria(e => !e)}
                className="text-xs text-[#0F4C35] mt-1 hover:underline"
              >
                {expandCriteria ? 'Show less ↑' : 'Read more ↓'}
              </button>
            )}
          </div>

          {/* Funder theme keywords */}
          {themeKeywords.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Key themes</p>
              <div className="flex flex-wrap gap-1.5">
                {themeKeywords.map(kw => (
                  <span key={kw} className="text-[10px] bg-green-50 text-[#0F4C35] px-2 py-0.5 rounded-full capitalize font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Required docs checklist */}
          <div className="p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Likely required docs</p>
            <ul className="space-y-2">
              {REQUIRED_DOCS.map(doc => (
                <li key={doc} className="flex items-start gap-2">
                  <svg className="flex-shrink-0 mt-0.5 text-gray-300" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span className="text-xs text-gray-600">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ══ MIDDLE PANEL ════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Question tabs */}
          <div className="bg-white border-b border-gray-200 flex items-stretch overflow-x-auto flex-shrink-0">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => switchQuestion(idx)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-r border-gray-100 transition-colors group relative ${
                  idx === activeIdx
                    ? 'text-[#0F4C35] bg-green-50 border-b-2 border-b-[#0F4C35]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center flex-shrink-0 font-bold ${
                  idx === activeIdx ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <span className="max-w-[110px] truncate">{q.text.split(' ').slice(0, 4).join(' ')}…</span>
                {q.aiScore !== null && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    q.aiScore >= 8 ? 'bg-green-400' : q.aiScore >= 6 ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                )}
                {questions.length > 1 && (
                  <span
                    onClick={e => removeQuestion(e, idx)}
                    className="hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-gray-200 text-gray-400 text-[10px] ml-0.5"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}

            {/* Add question dropdown */}
            <div className="flex-shrink-0 relative" ref={addQRef}>
              <button
                onClick={() => setShowAddQ(s => !s)}
                className="flex items-center gap-1 px-3 h-full text-xs text-gray-400 hover:text-[#0F4C35] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
                Add
              </button>

              {showAddQ && (
                <div className="absolute top-full left-0 z-30 w-76 bg-white border border-gray-200 rounded-xl shadow-xl p-3 mt-1 min-w-[280px]">
                  <input
                    autoFocus
                    value={newQText}
                    onChange={e => setNewQText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && newQText.trim() && addQuestion(newQText.trim())}
                    placeholder="Type a custom question…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35] mb-2"
                  />
                  <button
                    onClick={() => newQText.trim() && addQuestion(newQText.trim())}
                    disabled={!newQText.trim()}
                    className="w-full text-xs bg-[#0F4C35] disabled:bg-gray-200 disabled:text-gray-400 text-white py-2 rounded-lg font-semibold mb-2 hover:bg-[#0c3d2a] transition-colors"
                  >
                    Add question
                  </button>
                  <button
                    onClick={() => setShowCommon(s => !s)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
                  >
                    Or pick a common question {showCommon ? '↑' : '↓'}
                  </button>
                  {showCommon && (
                    <div className="mt-2 space-y-0.5 max-h-44 overflow-y-auto">
                      {COMMON_QUESTIONS
                        .filter(cq => !questions.find(q => q.text === cq))
                        .map(cq => (
                          <button
                            key={cq}
                            onClick={() => addQuestion(cq)}
                            className="w-full text-left text-xs text-gray-600 hover:text-[#0F4C35] hover:bg-green-50 px-2.5 py-2 rounded-lg transition-colors"
                          >
                            {cq}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeQ && (
              <div className="max-w-2xl mx-auto">

                {/* Question heading */}
                <h3 className="font-display font-bold text-[#0D1117] text-base mb-1 leading-snug">
                  {activeQ.text}
                </h3>
                <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                  <span>Target: ~{activeQ.targetWords} words</span>
                  <span className="text-[#0F4C35] font-medium">⌘K for AI commands</span>
                  {isExecuting && (
                    <span className="flex items-center gap-1.5 text-[#0F4C35]">
                      <span className="w-3 h-3 border-2 border-[#0F4C35] border-t-transparent rounded-full animate-spin inline-block" />
                      Applying AI edit…
                    </span>
                  )}
                </div>

                {/* Editor card */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <textarea
                    ref={textareaRef}
                    value={activeQ.answer}
                    onChange={e => handleTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Start writing your answer…

AI will suggest continuations after you pause typing.
Press Tab to accept · ⌘K for commands like 'Make shorter' or 'Add impact evidence'."
                    className="w-full p-5 text-sm text-gray-800 leading-[1.75] resize-none focus:outline-none placeholder:text-gray-300 min-h-[260px]"
                    rows={14}
                  />

                  {/* Word count bar */}
                  <div className="px-5 py-2.5 border-t border-gray-100 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${wcPct}%`, backgroundColor: wcColor }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: wcColor }}>
                      {wc} / {wcTarget}
                    </span>
                    <span className="text-xs text-gray-400">words</span>
                  </div>

                  {/* Ghost text / AI suggestion */}
                  {(isGenerating || ghostText) && (
                    <div className="px-5 py-3 border-t border-dashed border-gray-200 bg-gray-50/70">
                      {isGenerating ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-[#0F4C35]/40 animate-bounce"
                                style={{ animationDelay: `${i * 0.12}s` }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">Generating suggestion…</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2.5 mb-2.5">
                            <span className="text-[10px] font-bold text-[#0F4C35] bg-green-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                              ✦ AI
                            </span>
                            <p className="text-sm text-gray-500 leading-relaxed">{ghostText}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={acceptGhost}
                              className="text-xs bg-[#0F4C35] text-white px-3 py-1 rounded-lg font-semibold hover:bg-[#0c3d2a] transition-colors flex items-center gap-1.5"
                            >
                              <kbd className="font-mono opacity-75">Tab</kbd> Accept
                            </button>
                            <button
                              onClick={() => setGhostText('')}
                              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Pre-fill hint */}
                {!activeQ.answer.trim() && tryPrefill(activeQ.text, profile) && (
                  <button
                    onClick={() => {
                      const prefill = tryPrefill(activeQ.text, profile)
                      setQuestions(prev => prev.map((q, i) => i === activeIdx ? { ...q, answer: prefill } : q))
                    }}
                    className="mt-3 text-xs text-[#0F4C35] hover:underline flex items-center gap-1.5"
                  >
                    ✦ Pre-fill from your charity profile →
                  </button>
                )}

                <p className="mt-3 text-xs text-gray-400 text-center">
                  <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">⌘K</kbd>
                  {' '}AI commands · {' '}
                  <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">Tab</kbd>
                  {' '}accept suggestion · auto-saves every 30s
                </p>
              </div>
            )}
          </div>
        </main>

        {/* ══ RIGHT PANEL ═════════════════════════════════════════════ */}
        <aside className="w-64 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">

          {/* Score ring */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">AI Score</p>
              <button
                onClick={() => triggerScore()}
                disabled={isScoring || !activeQ?.answer.trim()}
                className="text-xs text-[#0F4C35] hover:underline disabled:text-gray-300 disabled:no-underline transition-colors"
              >
                {isScoring ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-[#0F4C35] border-t-transparent rounded-full animate-spin inline-block" />
                    Scoring…
                  </span>
                ) : 'Update ↻'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <svg width="76" height="76" viewBox="0 0 76 76" className="flex-shrink-0">
                <circle cx="38" cy="38" r="30" fill="none" stroke="#f0f0f0" strokeWidth="6"/>
                <circle
                  cx="38" cy="38" r="30"
                  fill="none"
                  stroke={scoreResult ? scoreRingColor(scoreResult.score) : '#e5e7eb'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUM}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 38 38)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s' }}
                />
                <text x="38" y="36" textAnchor="middle" fontSize="17" fontWeight="700"
                  fill={scoreResult ? scoreRingColor(scoreResult.score) : '#d1d5db'}>
                  {scoreResult ? scoreResult.score : '–'}
                </text>
                <text x="38" y="50" textAnchor="middle" fontSize="9" fill="#9ca3af">/10</text>
              </svg>
              <div>
                {!scoreResult && !isScoring && (
                  <p className="text-xs text-gray-400 leading-relaxed">Write 50+ words to get an AI score</p>
                )}
                {scoreResult && (
                  <>
                    <p className="text-sm font-bold" style={{ color: scoreRingColor(scoreResult.score) }}>
                      {scoreLabel(scoreResult.score)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {scoreResult.strengths.length} strength{scoreResult.strengths.length !== 1 ? 's' : ''} found
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Strengths */}
          {scoreResult && scoreResult.strengths.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Strengths</p>
              <ul className="space-y-2">
                {scoreResult.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                    <span className="text-green-500 flex-shrink-0 font-bold mt-px">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {scoreResult && scoreResult.improvements.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Suggestions</p>
              <ul className="space-y-2.5">
                {scoreResult.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                    <span className="text-amber-500 flex-shrink-0 font-bold mt-px">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All-questions progress */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">All questions</p>
            <div className="space-y-1">
              {questions.map((q, idx) => {
                const wc2 = wordCount(q.answer)
                const done = wc2 > 50
                const color = done
                  ? q.aiScore !== null
                    ? q.aiScore >= 7 ? 'bg-green-400' : 'bg-amber-400'
                    : 'bg-blue-300'
                  : 'bg-gray-200'
                return (
                  <button
                    key={q.id}
                    onClick={() => switchQuestion(idx)}
                    className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-colors ${
                      idx === activeIdx ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                    <span className="text-xs text-gray-600 truncate leading-relaxed">
                      {q.text.split(' ').slice(0, 4).join(' ')}…
                    </span>
                    {q.aiScore !== null && (
                      <span className="ml-auto text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                        {q.aiScore}/10
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Charity data panel */}
          <div className="p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Your data</p>
            <dl className="space-y-2">
              {profile.sector && (
                <div>
                  <dt className="text-[9px] text-gray-400 uppercase tracking-widest">Sector</dt>
                  <dd className="text-xs text-gray-700 capitalize">{profile.sector.replace(/_/g, ' ')}</dd>
                </div>
              )}
              {profile.location && (
                <div>
                  <dt className="text-[9px] text-gray-400 uppercase tracking-widest">Location</dt>
                  <dd className="text-xs text-gray-700">{profile.location}</dd>
                </div>
              )}
              {profile.annual_income && (
                <div>
                  <dt className="text-[9px] text-gray-400 uppercase tracking-widest">Annual income</dt>
                  <dd className="text-xs text-gray-700">{INCOME_LABELS[profile.annual_income] ?? profile.annual_income}</dd>
                </div>
              )}
              {profile.beneficiaries && (
                <div>
                  <dt className="text-[9px] text-gray-400 uppercase tracking-widest">Beneficiaries</dt>
                  <dd className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{profile.beneficiaries}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>

      {/* ── CMD+K Palette ────────────────────────────────────────────── */}
      {showCmdPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-28 px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowCmdPalette(false); setCmdQuery('') }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            {/* Search bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 12l2.5 2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              <input
                autoFocus
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setShowCmdPalette(false); setCmdQuery('') }
                  if (e.key === 'Enter' && filteredCmds.length > 0) executeCommand(filteredCmds[0].id)
                }}
                placeholder="Search AI commands…"
                className="flex-1 text-sm text-gray-800 focus:outline-none bg-transparent placeholder:text-gray-400"
              />
              <kbd className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono">esc</kbd>
            </div>

            {/* Command list */}
            <div className="py-1.5 max-h-72 overflow-y-auto">
              {filteredCmds.length > 0 ? filteredCmds.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={() => executeCommand(cmd.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 transition-colors text-left ${
                    idx === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl w-7 flex-shrink-0">{cmd.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{cmd.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cmd.desc}</p>
                  </div>
                  {idx === 0 && (
                    <kbd className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                      ↵
                    </kbd>
                  )}
                </button>
              )) : (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">
                  No commands match &ldquo;{cmdQuery}&rdquo;
                </p>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] text-gray-400">
                AI will rewrite your current answer · changes can be undone by typing
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quality Check Modal ───────────────────────────────────────── */}
      {showQualityCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isCheckingQuality && setShowQuality(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-1">
                <span className="text-2xl">✦</span>
                <div>
                  <h2 className="font-display font-bold text-[#0D1117] text-lg">Application Quality Check</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    AI review across all {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {isCheckingQuality ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <div
                  className="rounded-full border-[3px] border-[#0F4C35] border-t-transparent animate-spin"
                  style={{ width: 44, height: 44 }}
                />
                <p className="text-sm text-gray-500">Reviewing your application…</p>
              </div>
            ) : qualityResult ? (
              <div className="px-6 pb-6">
                {/* Overall score */}
                <div className="flex items-center gap-5 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg viewBox="0 0 80 80" className="w-full h-full">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#f0f0f0" strokeWidth="7"/>
                      <circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={scoreRingColor(qualityResult.overallScore / 10)}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={2 * Math.PI * 32 - (qualityResult.overallScore / 100) * 2 * Math.PI * 32}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-[#0D1117]">{qualityResult.overallScore}</span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: scoreRingColor(qualityResult.overallScore / 10) }}>
                      {qualityResult.overallScore >= 85 ? '🏆 Ready to submit!' :
                       qualityResult.overallScore >= 70 ? 'Almost there' :
                       qualityResult.overallScore >= 50 ? 'Good progress' : 'Needs more work'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {qualityResult.readyToSubmit
                        ? 'Your application is strong across all sections.'
                        : `Improve ${qualityResult.improvements.length} area${qualityResult.improvements.length !== 1 ? 's' : ''} to reach 90+`}
                    </p>
                  </div>
                </div>

                {/* Improvement list */}
                {qualityResult.improvements.length > 0 && (
                  <div className="space-y-2.5 mb-6">
                    {qualityResult.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <span className="text-amber-600 font-bold text-sm flex-shrink-0 mt-px">{i + 1}</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{imp}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQuality(false)}
                    className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Keep editing
                  </button>
                  {qualityResult.readyToSubmit && (
                    <Link
                      href="/pipeline"
                      className="flex-1 py-2.5 text-sm bg-[#0F4C35] text-white rounded-xl font-bold text-center hover:bg-[#0c3d2a] transition-colors"
                    >
                      Back to pipeline →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <p className="text-sm text-gray-400 text-center py-6">Quality check failed. Please try again.</p>
                <button
                  onClick={() => setShowQuality(false)}
                  className="w-full py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
