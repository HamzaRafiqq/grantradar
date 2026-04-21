'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Sector, AnnualIncome } from '@/types'

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

const ukRegions = [
  'East Midlands', 'East of England', 'Greater London', 'North East England',
  'North West England', 'Northern Ireland', 'Scotland', 'South East England',
  'South West England', 'Wales', 'West Midlands', 'Yorkshire and the Humber',
]

const incomeOptions: { value: AnnualIncome; label: string }[] = [
  { value: 'under_100k', label: 'Under £100,000' },
  { value: '100k_500k', label: '£100,000 – £500,000' },
  { value: 'over_500k', label: 'Over £500,000' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    sector: '' as Sector,
    location: '',
    annual_income: '' as AnnualIncome,
    registered_charity: true,
    charity_number: '',
    beneficiaries: '',
    current_projects: '',
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStep(3)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Save organisation
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ ...form, user_id: user.id })
      .select()
      .single()

    if (orgError) {
      setError('Failed to save your organisation. Please try again.')
      setStep(2)
      setLoading(false)
      return
    }

    // Trigger AI matching
    const res = await fetch('/api/grants/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId: org.id }),
    })

    const data = await res.json()
    setMatchCount(data.count ?? 0)

    // Send welcome email
    await fetch('/api/email/welcome', { method: 'POST' })

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
            <span className="font-display font-bold text-xl text-[#0F4C35]">GrantRadar</span>
          </div>
        </div>

        {/* Progress */}
        {step <= 2 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-[#0F4C35]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {/* Step 1 — Welcome */}
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
            <h1 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Welcome to GrantRadar</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
              We're going to ask you a few questions about your charity so our AI can scan hundreds of UK grants and find the ones you're genuinely eligible for.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              {[
                { value: '3 min', label: 'Setup time' },
                { value: '380+', label: 'Grants scanned' },
                { value: 'Free', label: 'Always' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#F4F6F5] rounded-xl p-3">
                  <div className="font-bold text-[#0F4C35] text-lg">{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full justify-center py-3.5">
              Let's get started
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Step 2 — Organisation Form */}
        {step === 2 && (
          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-1">Tell us about your charity</h2>
            <p className="text-gray-500 text-sm mb-6">This helps us find grants you're actually eligible for.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Charity name</label>
                <input
                  required
                  className="input"
                  placeholder="Brightside Youth Trust"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Primary sector</label>
                <select
                  required
                  className="input"
                  value={form.sector}
                  onChange={(e) => update('sector', e.target.value)}
                >
                  <option value="">Select your sector...</option>
                  {sectors.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Location (UK region)</label>
                <select
                  required
                  className="input"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                >
                  <option value="">Select your region...</option>
                  {ukRegions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Annual income</label>
                <select
                  required
                  className="input"
                  value={form.annual_income}
                  onChange={(e) => update('annual_income', e.target.value)}
                >
                  <option value="">Select income range...</option>
                  {incomeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="registered"
                  className="w-4 h-4 accent-[#0F4C35]"
                  checked={form.registered_charity}
                  onChange={(e) => update('registered_charity', e.target.checked)}
                />
                <label htmlFor="registered" className="text-sm text-gray-700">
                  We are a registered charity with the Charity Commission
                </label>
              </div>

              {form.registered_charity && (
                <div>
                  <label className="label">Charity number (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. 1234567"
                    value={form.charity_number}
                    onChange={(e) => update('charity_number', e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="label">Who do you help? (beneficiaries)</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Young people aged 11-25 in deprived areas of South Manchester experiencing mental health challenges and social isolation."
                  value={form.beneficiaries}
                  onChange={(e) => update('beneficiaries', e.target.value)}
                />
              </div>

              <div>
                <label className="label">What are you currently working on?</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Running weekly drop-in counselling sessions, a community garden project, and an after-school mentoring programme for 120 young people."
                  value={form.current_projects}
                  onChange={(e) => update('current_projects', e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
              >
                Find my grants
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Step 3 — Loading */}
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
              Our AI is scanning 380+ UK grants and scoring your eligibility for each one. This takes about 10–15 seconds.
            </p>
            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              {['Analysing your charity profile...', 'Scanning grant databases...', 'Scoring eligibility...'].map((msg, i) => (
                <div key={msg} className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C875] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Success */}
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
              Each one has been scored for eligibility with a specific reason why it matches your charity. Let's go explore them.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary px-8 py-3.5 justify-center"
            >
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
