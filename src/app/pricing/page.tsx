'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

// ── Currency config ───────────────────────────────────────────────────────────

type Currency = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD'

const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: 'GBP', symbol: '£', label: '£ GBP' },
  { code: 'USD', symbol: '$', label: '$ USD' },
  { code: 'EUR', symbol: '€', label: '€ EUR' },
  { code: 'AUD', symbol: 'A$', label: 'A$ AUD' },
  { code: 'CAD', symbol: 'C$', label: 'C$ CAD' },
]

const PRICES = {
  starter: {
    monthly: { GBP: 9,  USD: 11, EUR: 10, AUD: 15, CAD: 13 },
    annual:  { GBP: 7,  USD: 9,  EUR: 8,  AUD: 12, CAD: 11 },
    annualTotal: { GBP: 90,  USD: 108, EUR: 99,  AUD: 144, CAD: 126 },
    annualSave:  { GBP: 18,  USD: 24,  EUR: 21,  AUD: 36,  CAD: 30 },
  },
  pro: {
    monthly: { GBP: 49, USD: 59, EUR: 55, AUD: 89, CAD: 79 },
    annual:  { GBP: 39, USD: 47, EUR: 44, AUD: 71, CAD: 63 },
    annualTotal: { GBP: 470, USD: 564, EUR: 528, AUD: 852, CAD: 756 },
    annualSave:  { GBP: 118, USD: 144, EUR: 132, AUD: 216, CAD: 192 },
  },
  agency: {
    monthly: { GBP: 99, USD: 119, EUR: 109, AUD: 179, CAD: 159 },
    annual:  { GBP: 79, USD: 95,  EUR: 87,  AUD: 143, CAD: 127 },
    annualTotal: { GBP: 948,  USD: 1140, EUR: 1044, AUD: 1716, CAD: 1524 },
    annualSave:  { GBP: 240,  USD: 288,  EUR: 264,  AUD: 432,  CAD: 384 },
  },
}

const LOCALE_CURRENCY: Record<string, Currency> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD',
  DE: 'EUR', FR: 'EUR', NL: 'EUR', IE: 'EUR', IT: 'EUR',
  ES: 'EUR', AT: 'EUR', BE: 'EUR', PT: 'EUR', FI: 'EUR',
}

function detectCurrency(): Currency {
  try {
    const region = new Intl.Locale(navigator.language).region ?? ''
    return LOCALE_CURRENCY[region] ?? 'USD'
  } catch { return 'USD' }
}

// ── Feature lists ─────────────────────────────────────────────────────────────

const freeFeatures = [
  '3 matched grants',
  'UK grant database included',
  'Eligibility scoring (1–10)',
  'Match reason from AI',
  'Basic deadline view',
  'Grant status tracking',
]

const starterFeatures = [
  'Unlimited grant views',
  'Full funder names & details',
  'Deadlines & apply links',
  'Deadline reminder emails',
  'Basic tracker (save 25 grants)',
  'Email support',
]

const proFeatures = [
  'Unlimited matched grants',
  'AI application drafts',
  'Deadline alert emails',
  'Weekly digest emails',
  'Pipeline kanban board',
  'Priority support',
  'Re-run matching any time',
]

const agencyFeatures = [
  'Everything in Pro',
  'Up to 10 charity profiles',
  '3 team member seats',
  'Bulk grant matching',
  'White-label PDF reports',
  'Priority support (24hr)',
  'Dedicated onboarding call',
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${muted ? 'bg-gray-100' : 'bg-[#E8F2ED]'}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2 2 4-4" stroke={muted ? '#D1D5DB' : '#0F4C35'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function CrossIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M3 3l4 4M7 3L3 7" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [currency, setCurrency] = useState<Currency>('GBP')
  const [loading, setLoading] = useState<'starter' | 'pro' | 'agency' | null>(null)

  useEffect(() => {
    setCurrency(detectCurrency())
  }, [])

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol ?? '£'

  const starterMonthly = PRICES.starter.monthly[currency]
  const starterAnnual  = PRICES.starter.annual[currency]
  const starterTotal   = PRICES.starter.annualTotal[currency]
  const starterSave    = PRICES.starter.annualSave[currency]

  const proMonthly = PRICES.pro.monthly[currency]
  const proAnnual  = PRICES.pro.annual[currency]
  const proTotal   = PRICES.pro.annualTotal[currency]
  const proSave    = PRICES.pro.annualSave[currency]

  const agencyMonthly = PRICES.agency.monthly[currency]
  const agencyAnnual  = PRICES.agency.annual[currency]
  const agencyTotal   = PRICES.agency.annualTotal[currency]
  const agencySave    = PRICES.agency.annualSave[currency]

  const starterPrice = isAnnual ? starterAnnual : starterMonthly
  const proPrice    = isAnnual ? proAnnual    : proMonthly
  const agencyPrice = isAnnual ? agencyAnnual : agencyMonthly

  async function handleCheckout(plan: 'starter' | 'pro' | 'agency') {
    setLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, annual: isAnnual, currency }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(null)
    }
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

        {/* Controls: billing toggle + currency switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          {/* Billing toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                !isAnnual ? 'bg-[#0F4C35] text-white border-[#0F4C35]' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                isAnnual ? 'bg-[#0F4C35] text-white border-[#0F4C35]' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
              }`}
            >
              Annual
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAnnual ? 'bg-[#00C875] text-[#0D1117]' : 'bg-green-100 text-green-700'}`}>
                Save 20%
              </span>
            </button>
          </div>

          {/* Currency switcher */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Currency:</span>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

          {/* Free */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Free</h2>
              <p className="text-gray-400 text-sm mt-1">Perfect for getting started</p>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}0</span>
            </div>
            <p className="text-gray-400 text-sm mb-8">Forever. No credit card.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckIcon /> {f}
                </li>
              ))}
              {['AI application drafts', 'Deadline alerts', 'Pipeline board'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <CrossIcon /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary w-full justify-center py-3.5 text-sm">
              Get started free
            </Link>
          </div>

          {/* Starter */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Starter</h2>
              <p className="text-gray-400 text-sm mt-1">For charities just getting going</p>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{starterPrice}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual ? (
              <>
                <p className="text-green-600 text-xs font-semibold mb-1">Save {sym}{starterSave}/year</p>
                <p className="text-gray-400 text-sm mb-8">Billed {sym}{starterTotal}/year</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm mb-8">Cancel any time</p>
            )}
            <ul className="space-y-3 mb-8 flex-1">
              {starterFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckIcon /> {f}
                </li>
              ))}
              {['AI application drafts', 'Pipeline kanban board', 'Multi-user seats'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <CrossIcon /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('starter')}
              disabled={loading !== null}
              className="btn-secondary w-full justify-center py-3.5 text-sm disabled:opacity-60"
            >
              {loading === 'starter' ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/></svg> Redirecting...</>
              ) : `Get Starter — ${sym}${starterPrice}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Stripe</p>
          </div>

          {/* Pro */}
          <div className="card border-2 border-[#0F4C35] relative flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Pro</h2>
              <p className="text-gray-400 text-sm mt-1">For serious fundraising teams</p>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{proPrice}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual ? (
              <>
                <p className="text-green-600 text-xs font-semibold mb-1">Save {sym}{proSave}/year</p>
                <p className="text-gray-400 text-sm mb-8">Billed {sym}{proTotal}/year</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm mb-8">Cancel any time</p>
            )}
            <ul className="space-y-3 mb-8 flex-1">
              {proFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('pro')}
              disabled={loading !== null}
              className="btn-primary w-full justify-center py-3.5 text-sm disabled:opacity-60"
            >
              {loading === 'pro' ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/></svg> Redirecting...</>
              ) : `Get Pro — ${sym}${proPrice}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Stripe</p>
          </div>

          {/* Agency */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Agency</h2>
              <p className="text-gray-400 text-sm mt-1">For consultants & multi-org teams</p>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#0D1117]">{sym}{agencyPrice}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual ? (
              <>
                <p className="text-green-600 text-xs font-semibold mb-1">Save {sym}{agencySave}/year</p>
                <p className="text-gray-400 text-sm mb-8">Billed {sym}{agencyTotal}/year</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm mb-8">Cancel any time</p>
            )}
            <ul className="space-y-3 mb-8 flex-1">
              {agencyFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('agency')}
              disabled={loading !== null}
              className="btn-primary w-full justify-center py-3.5 text-sm disabled:opacity-60"
            >
              {loading === 'agency' ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/></svg> Redirecting...</>
              ) : `Get Agency — ${sym}${agencyPrice}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Includes onboarding call</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold text-[#0D1117] text-center mb-10">Common questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { q: 'Can I cancel any time?', a: "Yes. Cancel from your Settings page and you'll keep access until the end of your billing period." },
              { q: 'Which grants are included?', a: 'FundsRadar is built primarily for UK charities and includes a comprehensive UK grant database covering National Lottery, Esmée Fairbairn, Comic Relief, Lloyds Bank Foundation, and hundreds more.' },
              { q: 'Can I switch currencies?', a: 'Yes — use the currency switcher above. You\'ll be charged in your chosen currency via Stripe. Prices shown are approximate equivalents.' },
              { q: 'What is the Agency plan for?', a: 'Grant consultants or umbrella organisations managing multiple charities. One login, up to 10 profiles, and bulk matching across all of them.' },
            ].map(item => (
              <div key={item.q} className="card">
                <h3 className="font-semibold text-[#0D1117] mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
