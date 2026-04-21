'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

const freeFeatures = [
  '3 matched grants',
  'Eligibility scoring (1–10)',
  'Match reason from AI',
  'Basic deadline view',
  'Grant status tracking',
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

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [loading, setLoading] = useState<'pro' | 'agency' | null>(null)

  async function handleCheckout(plan: 'pro' | 'agency') {
    setLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, annual: isAnnual }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(null)
    }
  }

  const proPrice = isAnnual ? 39 : 49
  const agencyPrice = isAnnual ? 79 : 99

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#0D1117] mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you're ready to unlock AI matching, drafts, and deadline alerts.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
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
              2 months free
            </span>
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 items-start">

          {/* Free */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Free</h2>
              <p className="text-gray-400 text-sm mt-1">Perfect for getting started</p>
            </div>
            <div className="mb-2">
              <span className="text-5xl font-bold text-[#0D1117]">£0</span>
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

          {/* Pro — highlighted */}
          <div className="card border-2 border-[#0F4C35] relative flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Pro</h2>
              <p className="text-gray-400 text-sm mt-1">For serious fundraisers</p>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#0D1117]">£{proPrice}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual && (
              <p className="text-green-600 text-xs font-semibold mb-1">Save £120/year</p>
            )}
            <p className="text-gray-400 text-sm mb-8">
              {isAnnual ? 'Billed £468/year' : 'Cancel any time'}
            </p>
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
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                  </svg>
                  Redirecting...
                </>
              ) : `Get Pro — £${proPrice}/mo`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Secure payment via Stripe</p>
          </div>

          {/* Agency */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Agency</h2>
              <p className="text-gray-400 text-sm mt-1">For consultants & multi-charity teams</p>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#0D1117]">£{agencyPrice}</span>
              <span className="text-gray-400 text-sm mb-2">/mo</span>
            </div>
            {isAnnual && (
              <p className="text-green-600 text-xs font-semibold mb-1">Save £240/year</p>
            )}
            <p className="text-gray-400 text-sm mb-8">
              {isAnnual ? 'Billed £948/year' : 'Cancel any time'}
            </p>
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
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                  </svg>
                  Redirecting...
                </>
              ) : `Get Agency — £${agencyPrice}/mo`}
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
              { q: 'How accurate is the AI matching?', a: "Our AI scores each grant against your charity's sector, size, location and work — not generic tags. Users report 90%+ relevance." },
              { q: 'Are the grants real and up to date?', a: 'Yes. We track 380+ active UK grant programmes and update deadlines regularly. Closed grants are hidden automatically.' },
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
