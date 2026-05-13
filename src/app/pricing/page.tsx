'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

// ── Currency ──────────────────────────────────────────────────────────────────

type Currency = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD'

const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: 'GBP', symbol: '£',  label: '£ GBP' },
  { code: 'USD', symbol: '$',  label: '$ USD' },
  { code: 'EUR', symbol: '€',  label: '€ EUR' },
  { code: 'AUD', symbol: 'A$', label: 'A$ AUD' },
  { code: 'CAD', symbol: 'C$', label: 'C$ CAD' },
]

const PRICES = {
  starter: {
    monthly:    { GBP: 9,   USD: 11,  EUR: 10,  AUD: 15,  CAD: 13  },
    annual:     { GBP: 7,   USD: 9,   EUR: 8,   AUD: 12,  CAD: 11  },
    annualTotal:{ GBP: 90,  USD: 108, EUR: 99,  AUD: 144, CAD: 126 },
    annualSave: { GBP: 18,  USD: 24,  EUR: 21,  AUD: 36,  CAD: 30  },
  },
  pro: {
    monthly:    { GBP: 49,  USD: 59,  EUR: 55,  AUD: 89,  CAD: 79  },
    annual:     { GBP: 39,  USD: 47,  EUR: 44,  AUD: 71,  CAD: 63  },
    annualTotal:{ GBP: 470, USD: 564, EUR: 528, AUD: 852, CAD: 756 },
    annualSave: { GBP: 118, USD: 144, EUR: 132, AUD: 216, CAD: 192 },
  },
  agency: {
    monthly:    { GBP: 99,  USD: 119, EUR: 109, AUD: 179, CAD: 159  },
    annual:     { GBP: 79,  USD: 95,  EUR: 87,  AUD: 143, CAD: 127  },
    annualTotal:{ GBP: 948, USD: 1140,EUR: 1044,AUD: 1716,CAD: 1524 },
    annualSave: { GBP: 240, USD: 288, EUR: 264, AUD: 432, CAD: 384  },
  },
}

// ── Feature lists (clean progression Free → Starter → Pro → Agency) ──────────

const freeFeatures    = [
  '3 matched grants',
  'UK grant database (300+ active grants)',
  'AI eligibility score (1–10)',
  'Match reason from AI',
  'Deadline date visible',
  'Grant status tracking',
]
const freeLocked      = ['Full funder names', 'Apply links', 'Deadline email alerts', 'Pipeline board', 'AI drafts']

const starterFeatures = [
  'Everything in Free',
  'Unlimited grant matches',
  'Full funder names & details',
  'Direct apply links',
  'Deadline reminder emails (30d, 7d, 1d)',
  'Save up to 25 grants',
  'Charity profile on FundsRadar website',
  'Email support',
]
const starterLocked   = ['AI application drafts', 'Pipeline kanban board', 'Weekly digest']

const proFeatures     = [
  'Everything in Starter',
  'Unlimited saved grants',
  'AI application drafts',
  'Pipeline kanban board',
  'Weekly grant digest emails',
  'Trust score reports',
  'Re-run grant matching any time',
  'Priority support',
]

const agencyFeatures  = [
  'Everything in Pro',
  'Up to 10 charity profiles',
  '3 team member seats',
  'Bulk grant matching',
  'White-label PDF reports',
  'Priority support (24hr)',
  'Dedicated onboarding call',
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function Check() {
  return (
    <div className="w-5 h-5 rounded-full bg-[#E8F2ED] flex items-center justify-center flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function Cross() {
  return (
    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M3 3l4 4M7 3L3 7" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  // Default to GBP — UK charity product
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [loading, setLoading]   = useState<'starter' | 'pro' | 'agency' | null>(null)

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£'

  const price = (plan: keyof typeof PRICES) =>
    isAnnual ? PRICES[plan].annual[currency] : PRICES[plan].monthly[currency]

  const save  = (plan: keyof typeof PRICES) => PRICES[plan].annualSave[currency]
  const total = (plan: keyof typeof PRICES) => PRICES[plan].annualTotal[currency]

  async function handleCheckout(plan: 'starter' | 'pro' | 'agency') {
    setLoading(plan)
    const res  = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, annual: isAnnual, currency }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#0D1117] mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to unlock AI matching, drafts, and deadline alerts.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          {/* Billing toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isAnnual ? 'bg-[#0F4C35] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isAnnual ? 'bg-[#0F4C35] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C875] text-[#0D1117]">
                −20%
              </span>
            </button>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Currency:</span>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
            >
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

          {/* ── FREE ── */}
          <div className="card flex flex-col h-full">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Free</p>
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Get started</h2>
              <p className="text-gray-400 text-sm mt-1">Explore grants with no commitment</p>
            </div>
            <div className="mb-1">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}0</span>
            </div>
            <p className="text-gray-400 text-sm mb-6">Forever free · No card needed</p>

            <ul className="space-y-2.5 mb-6 flex-1">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                  <Check /><span>{f}</span>
                </li>
              ))}
              <li className="pt-1 border-t border-gray-100" />
              {freeLocked.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                  <Cross /><span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/signup" className="btn-secondary w-full justify-center py-3 text-sm">
              Get started free
            </Link>
          </div>

          {/* ── STARTER ── */}
          <div className="card flex flex-col h-full">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F4C35] mb-1">Starter</p>
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Essential tools</h2>
              <p className="text-gray-400 text-sm mt-1">For charities starting to apply</p>
            </div>
            <div className="mb-1 flex items-end gap-1.5">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{price('starter')}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual
              ? <><p className="text-green-600 text-xs font-semibold mb-0.5">Save {sym}{save('starter')}/yr</p><p className="text-gray-400 text-sm mb-6">Billed {sym}{total('starter')}/yr</p></>
              : <p className="text-gray-400 text-sm mb-6">Cancel any time</p>
            }

            <ul className="space-y-2.5 mb-6 flex-1">
              {starterFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                  <Check /><span>{f}</span>
                </li>
              ))}
              <li className="pt-1 border-t border-gray-100" />
              {starterLocked.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                  <Cross /><span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('starter')}
              disabled={loading !== null}
              className="btn-secondary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading === 'starter' ? <><Spinner /> Redirecting…</> : `Get Starter — ${sym}${price('starter')}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2.5">Secure payment via Stripe</p>
          </div>

          {/* ── PRO ── */}
          <div className="card border-2 border-[#0F4C35] relative flex flex-col h-full">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#00C875] text-[#0D1117] text-[10px] font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap uppercase tracking-wide">
                Most Popular
              </span>
            </div>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F4C35] mb-1">Pro</p>
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Full power</h2>
              <p className="text-gray-400 text-sm mt-1">For serious fundraising teams</p>
            </div>
            <div className="mb-1 flex items-end gap-1.5">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{price('pro')}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual
              ? <><p className="text-green-600 text-xs font-semibold mb-0.5">Save {sym}{save('pro')}/yr</p><p className="text-gray-400 text-sm mb-6">Billed {sym}{total('pro')}/yr</p></>
              : <p className="text-gray-400 text-sm mb-6">Cancel any time</p>
            }

            <ul className="space-y-2.5 mb-6 flex-1">
              {proFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                  <Check /><span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('pro')}
              disabled={loading !== null}
              className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading === 'pro' ? <><Spinner /> Redirecting…</> : `Get Pro — ${sym}${price('pro')}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2.5">Secure payment via Stripe</p>
          </div>

          {/* ── AGENCY ── */}
          <div className="card flex flex-col h-full">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Agency</p>
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Multi-org</h2>
              <p className="text-gray-400 text-sm mt-1">For consultants &amp; umbrella bodies</p>
            </div>
            <div className="mb-1 flex items-end gap-1.5">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{price('agency')}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual
              ? <><p className="text-green-600 text-xs font-semibold mb-0.5">Save {sym}{save('agency')}/yr</p><p className="text-gray-400 text-sm mb-6">Billed {sym}{total('agency')}/yr</p></>
              : <p className="text-gray-400 text-sm mb-6">Cancel any time</p>
            }

            <ul className="space-y-2.5 mb-6 flex-1">
              {agencyFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                  <Check /><span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('agency')}
              disabled={loading !== null}
              className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading === 'agency' ? <><Spinner /> Redirecting…</> : `Get Agency — ${sym}${price('agency')}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2.5">Includes onboarding call</p>
          </div>

        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-10 text-sm text-gray-400">
          <span>🔒 Stripe-secured payments</span>
          <span>✅ Cancel any time from Settings</span>
          <span>🇬🇧 Built for UK charities</span>
          <span>📧 hello@fundsradar.co</span>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold text-[#0D1117] text-center mb-10">Common questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { q: 'Can I cancel any time?', a: "Yes. Cancel from Settings and you keep access until the end of your billing period. No penalties, no questions asked." },
              { q: 'Which grants are included?', a: 'FundsRadar covers 300+ active UK grants including National Lottery, Esmée Fairbairn, Comic Relief, Lloyds Bank Foundation, and more. New grants added regularly.' },
              { q: 'What is the "charity profile on FundsRadar website" feature?', a: 'Starter+ charities get a public profile page on FundsRadar.co, helping funders find and learn about your work. Increases visibility with grant-makers.' },
              { q: 'What is the Agency plan for?', a: 'Grant consultants or umbrella organisations managing multiple charities. One login, up to 10 profiles, bulk matching, and white-label reports for your clients.' },
            ].map(item => (
              <div key={item.q} className="card">
                <h3 className="font-semibold text-[#0D1117] mb-2 text-sm">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
