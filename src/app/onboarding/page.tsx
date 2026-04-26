'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Sector, AnnualIncome } from '@/types'

// ── Static data ───────────────────────────────────────────────────────────────

const NONPROFIT_TYPES = [
  'Registered Charity (England & Wales)',
  'Registered Charity (Scotland)',
  'Registered Charity (Northern Ireland)',
  'Charitable Incorporated Organisation (CIO)',
  'Community Interest Company (CIC)',
  'Community Group (Unregistered)',
  'Other',
]

const sectors: { value: Sector; label: string }[] = [
  { value: 'animals', label: 'Animals & Wildlife' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'children', label: 'Children & Young People' },
  { value: 'disability', label: 'Disability' },
  { value: 'education', label: 'Education & Training' },
  { value: 'elderly', label: 'Elderly & Older People' },
  { value: 'environment', label: 'Environment & Conservation' },
  { value: 'health', label: 'Health & Wellbeing' },
  { value: 'homelessness', label: 'Homelessness & Housing' },
  { value: 'other', label: 'Other / General Community' },
]

const incomeOptions: { value: AnnualIncome; label: string }[] = [
  { value: 'under_100k', label: 'Under £100,000 (small)' },
  { value: '100k_500k', label: '£100,000 – £500,000 (medium)' },
  { value: 'over_500k', label: 'Over £500,000 (large)' },
]

// ── CC lookup types ───────────────────────────────────────────────────────────

interface CCData {
  name: string
  registrationNumber: string
  activities: string
  annualIncome: string
  incomeDisplay: string
  location: string
  geographicSpread: string
  website: string
  email: string
}

type CCStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'invalid' | 'error'

// ── AutoFilled badge ──────────────────────────────────────────────────────────

function AutoFilledBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F4C35] bg-[#E8F2ED] px-2 py-0.5 rounded-full ml-2">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4l1.5 1.5 3-3" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Auto-filled
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [error, setError] = useState('')

  // Charity Commission lookup state
  const [ccNumber, setCcNumber] = useState('')
  const [ccStatus, setCcStatus] = useState<CCStatus>('idle')
  const [ccData, setCcData] = useState<CCData | null>(null)
  const [ccConfirmed, setCcConfirmed] = useState(false)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    name: '',
    sector: '' as Sector,
    location: '',
    annual_income: '' as AnnualIncome,
    nonprofit_type: '',
    registration_number: '',
    beneficiaries: '',
    current_projects: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── Charity Commission lookup ─────────────────────────────────────────────

  async function verifyCharity() {
    if (!ccNumber.trim()) return
    setCcStatus('loading')
    setCcData(null)

    try {
      const res = await fetch('/api/charity-commission/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: ccNumber.trim() }),
      })

      if (res.status === 400) { setCcStatus('invalid'); return }
      if (res.status === 404) { setCcStatus('notfound'); return }
      if (!res.ok) { setCcStatus('error'); return }

      const data: CCData = await res.json()
      setCcData(data)
      setCcStatus('found')
    } catch {
      setCcStatus('error')
    }
  }

  function confirmCharity() {
    if (!ccData) return

    const filled = new Set<string>()
    const updates: Partial<typeof form> = {}

    if (ccData.name) { updates.name = ccData.name; filled.add('name') }
    if (ccData.registrationNumber) updates.registration_number = ccData.registrationNumber
    if (ccData.annualIncome) { updates.annual_income = ccData.annualIncome as AnnualIncome; filled.add('annual_income') }
    if (ccData.location) { updates.location = ccData.location; filled.add('location') }
    if (ccData.activities) { updates.beneficiaries = ccData.activities; filled.add('beneficiaries') }
    updates.nonprofit_type = 'Registered Charity (England & Wales)'

    setForm(f => ({ ...f, ...updates }))
    setAutoFilledFields(filled)
    setCcConfirmed(true)
    setCcStatus('idle')
  }

  function resetCcLookup() {
    setCcConfirmed(false)
    setCcStatus('idle')
    setCcData(null)
    setCcNumber('')
    setAutoFilledFields(new Set())
    setForm(f => ({
      ...f,
      name: '',
      registration_number: '',
      annual_income: '' as AnnualIncome,
      location: '',
      beneficiaries: '',
      nonprofit_type: '',
    }))
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStep(3)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: form.name,
        sector: form.sector,
        location: form.location,
        country: 'United Kingdom',
        currency: 'GBP',
        annual_income: form.annual_income,
        nonprofit_type: form.nonprofit_type,
        charity_number: form.registration_number || null,
        beneficiaries: form.beneficiaries,
        current_projects: form.current_projects,
        registered_charity: ['Registered Charity (England & Wales)', 'Registered Charity (Scotland)', 'Registered Charity (Northern Ireland)', 'Charitable Incorporated Organisation (CIO)'].includes(form.nonprofit_type),
        user_id: user.id,
      })
      .select()
      .single()

    if (orgError) {
      setError('Failed to save your organisation. Please try again.')
      setStep(2)
      setLoading(false)
      return
    }

    const res = await fetch('/api/grants/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId: org.id }),
    })
    const data = await res.json()
    setMatchCount(data.count ?? 0)
    await fetch('/api/email/welcome', { method: 'POST' })

    // Fire n8n Workflow 2: CC lookup + welcome email with match results
    // (non-blocking — failure never breaks signup)
    fetch('/api/n8n/new-charity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId:         org.id,
        orgName:       org.name,
        charityNumber: form.registration_number || null,
        country:       'England',
      }),
    }).catch(() => { /* ignore */ })

    setLoading(false)
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F4C35] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#00C875" strokeWidth="2"/>
                <circle cx="9" cy="9" r="3" fill="#00C875"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-[#0F4C35]">FundsRadar</span>
          </div>
        </div>

        {/* Progress bar */}
        {step <= 2 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-[#0F4C35]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F2ED] flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke="#0F4C35" strokeWidth="2"/>
                <circle cx="16" cy="16" r="6" fill="#00C875"/>
                <line x1="16" y1="3" x2="16" y2="7" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="25" y1="16" x2="29" y2="16" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="16" x2="7" y2="16" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="25" x2="16" y2="29" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#E8F2ED] px-3 py-1 rounded-full text-xs font-semibold text-[#0F4C35] mb-4">
              🇬🇧 Built for UK charities
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Welcome to FundsRadar</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
              Tell us about your charity and our AI will find the UK grants you&apos;re genuinely eligible for — matched to your sector, size, and location.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              {[
                { value: '3 min', label: 'Setup time' },
                { value: '1,000+', label: 'UK grants' },
                { value: '94%', label: 'Match accuracy' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#F4F6F5] rounded-xl p-3">
                  <div className="font-bold text-[#0F4C35] text-lg">{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full justify-center py-3.5">
              Let&apos;s get started
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 2: Form ── */}
        {step === 2 && (
          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-1">Tell us about your charity</h2>
            <p className="text-gray-500 text-sm mb-6">This helps us find UK grants you&apos;re actually eligible for.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Charity Commission auto-fill ── */}
              <div className="rounded-xl border border-[#0F4C35]/25 bg-[#E8F2ED]/60 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-[#0F4C35] flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#0F4C35]">Auto-fill from Charity Commission 🇬🇧</p>
                </div>
                <p className="text-xs text-gray-600 mb-3 ml-7">Enter your charity number to instantly fill your profile from official records.</p>

                {ccConfirmed && ccData ? (
                  <div className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 border border-[#0F4C35]/20">
                    <div className="w-6 h-6 rounded-full bg-[#0F4C35] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0D1117] truncate">{ccData.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Charity #{ccData.registrationNumber}
                        {ccData.incomeDisplay && <> · Income {ccData.incomeDisplay}</>}
                      </p>
                      {ccData.geographicSpread && <p className="text-xs text-gray-400 mt-0.5">{ccData.geographicSpread}</p>}
                    </div>
                    <button type="button" onClick={resetCcLookup} className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap flex-shrink-0">
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input flex-1"
                        placeholder="e.g. 1156234"
                        value={ccNumber}
                        onChange={e => { setCcNumber(e.target.value); if (ccStatus !== 'idle') setCcStatus('idle') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyCharity() } }}
                      />
                      <button
                        type="button"
                        onClick={verifyCharity}
                        disabled={!ccNumber.trim() || ccStatus === 'loading'}
                        className="btn-primary px-4 py-2 text-sm disabled:opacity-60 whitespace-nowrap flex items-center gap-1.5"
                      >
                        {ccStatus === 'loading' ? (
                          <>
                            <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 18 18" fill="none">
                              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                            </svg>
                            Checking...
                          </>
                        ) : 'Verify Charity'}
                      </button>
                    </div>

                    {ccStatus === 'notfound' && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-2">
                        Charity not found. Please check your number or fill in your details manually below.
                      </p>
                    )}
                    {ccStatus === 'invalid' && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg px-3 py-2">
                        Please enter a valid charity number (6–8 digits).
                      </p>
                    )}
                    {ccStatus === 'error' && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-2">
                        Couldn&apos;t reach the Charity Commission right now. Please fill in your details manually.
                      </p>
                    )}

                    {/* Preview card */}
                    {ccStatus === 'found' && ccData && (
                      <div className="mt-3 bg-white rounded-xl border border-[#0F4C35]/25 overflow-hidden">
                        <div className="px-4 pt-3 pb-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Is this your charity?</p>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[#E8F2ED] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="3" width="12" height="10" rx="2" stroke="#0F4C35" strokeWidth="1.5"/>
                                <path d="M5 7h6M5 10h4" stroke="#0F4C35" strokeWidth="1.25" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0D1117] text-sm leading-tight">{ccData.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Registered #{ccData.registrationNumber}
                                {ccData.incomeDisplay && <> · Annual income {ccData.incomeDisplay}</>}
                              </p>
                            </div>
                          </div>
                          {ccData.activities && (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-2">{ccData.activities}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                            {ccData.geographicSpread && (
                              <span className="text-xs text-gray-400">📍 {ccData.geographicSpread}</span>
                            )}
                            {ccData.website && (
                              <span className="text-xs text-[#0F4C35] truncate max-w-[200px]">
                                🌐 {ccData.website.replace(/^https?:\/\//, '')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex border-t border-gray-100">
                          <button
                            type="button"
                            onClick={confirmCharity}
                            className="flex-1 py-3 text-sm font-semibold text-[#0F4C35] hover:bg-[#E8F2ED] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2.5 7l3 3 6-6" stroke="#0F4C35" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Yes, that&apos;s us
                          </button>
                          <div className="w-px bg-gray-100" />
                          <button
                            type="button"
                            onClick={() => { setCcStatus('idle'); setCcData(null); setCcNumber('') }}
                            className="flex-1 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            Not our charity
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2 text-center">Optional — fill in the form below if you prefer</p>
                  </>
                )}
              </div>

              {/* Organisation name */}
              <div>
                <label className="label">
                  Charity name
                  {autoFilledFields.has('name') && <AutoFilledBadge />}
                </label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Bright Futures Charity"
                  value={form.name}
                  onChange={e => { update('name', e.target.value); setAutoFilledFields(s => { const n = new Set(s); n.delete('name'); return n }) }}
                />
              </div>

              {/* Org type */}
              <div>
                <label className="label">Organisation type</label>
                <select required className="input" value={form.nonprofit_type} onChange={e => update('nonprofit_type', e.target.value)}>
                  <option value="">Select your type...</option>
                  {NONPROFIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Sector */}
              <div>
                <label className="label">Primary sector</label>
                <select required className="input" value={form.sector} onChange={e => update('sector', e.target.value)}>
                  <option value="">Select your sector...</option>
                  {sectors.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="label">
                  City / Town
                  {autoFilledFields.has('location') && <AutoFilledBadge />}
                </label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Manchester"
                  value={form.location}
                  onChange={e => { update('location', e.target.value); setAutoFilledFields(s => { const n = new Set(s); n.delete('location'); return n }) }}
                />
              </div>

              {/* Annual income */}
              <div>
                <label className="label">
                  Annual income (£)
                  {autoFilledFields.has('annual_income') && <AutoFilledBadge />}
                </label>
                <select
                  required
                  className="input"
                  value={form.annual_income}
                  onChange={e => { update('annual_income', e.target.value); setAutoFilledFields(s => { const n = new Set(s); n.delete('annual_income'); return n }) }}
                >
                  <option value="">Select income range...</option>
                  {incomeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Beneficiaries */}
              <div>
                <label className="label">
                  Who do you help?
                  {autoFilledFields.has('beneficiaries') && <AutoFilledBadge />}
                </label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Young people aged 11–25 experiencing mental health challenges in underserved communities across Greater Manchester."
                  value={form.beneficiaries}
                  onChange={e => { update('beneficiaries', e.target.value); setAutoFilledFields(s => { const n = new Set(s); n.delete('beneficiaries'); return n }) }}
                />
              </div>

              {/* Current projects */}
              <div>
                <label className="label">What are you currently working on?</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Running weekly counselling sessions, a community garden project, and an after-school mentoring programme."
                  value={form.current_projects}
                  onChange={e => update('current_projects', e.target.value)}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 disabled:opacity-60">
                Find my grants
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3: Loading ── */}
        {step === 3 && (
          <div className="card text-center py-12">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#E8F2ED]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#0F4C35] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#00C875" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" fill="#00C875"/>
                </svg>
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Finding your grants...</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Our AI is scanning 1,000+ UK grants and scoring your eligibility for each one. This takes about 10–15 seconds.
            </p>
            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              {['Analysing your charity profile...', 'Scanning UK grant databases...', 'Scoring your eligibility...'].map((msg, i) => (
                <div key={msg} className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C875] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="card text-center py-10">
            <div className="w-16 h-16 rounded-full bg-[#E8F2ED] flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" fill="#0F4C35"/>
                <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-3">
              We found {matchCount} grant{matchCount !== 1 ? 's' : ''} for you!
            </h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Each one is scored for eligibility with a specific reason why it matches your charity. Let&apos;s go explore them.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary px-8 py-3.5 justify-center">
              View my grants
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
