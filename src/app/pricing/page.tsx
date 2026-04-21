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
  'Deadline alert emails (7-day notice)',
  'Weekly digest emails',
  'Pipeline kanban board',
  'Priority support',
  'Re-run matching any time',
]

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#0D1117] mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start free. Upgrade to Pro when you're ready to unlock AI drafts, unlimited matches, and deadline alerts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free */}
          <div className="card">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Free</h2>
              <p className="text-gray-400 text-sm mt-1">Perfect for getting started</p>
            </div>
            <div className="text-5xl font-bold text-[#0D1117] mb-2">£0</div>
            <p className="text-gray-400 text-sm mb-8">Forever. No credit card.</p>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-[#E8F2ED] flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {f}
                </li>
              ))}
              {['AI application drafts', 'Deadline alert emails', 'Pipeline board'].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 3l4 4M7 3L3 7" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/signup" className="btn-secondary w-full justify-center py-3.5">
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="card border-2 border-[#0F4C35] relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                MOST POPULAR
              </span>
            </div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-[#0D1117]">Pro</h2>
              <p className="text-gray-400 text-sm mt-1">For serious fundraisers</p>
            </div>
            <div className="text-5xl font-bold text-[#0D1117] mb-2">£49</div>
            <p className="text-gray-400 text-sm mb-8">per month, cancel any time</p>

            <ul className="space-y-3 mb-8">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-5 h-5 rounded-full bg-[#E8F2ED] flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                  </svg>
                  Redirecting to Stripe...
                </>
              ) : (
                'Get Pro — £49/mo'
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Secure payment via Stripe. Cancel any time.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold text-[#0D1117] text-center mb-10">
            Common questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Can I cancel any time?',
                a: 'Yes. Cancel from your Settings page and you\'ll keep Pro access until the end of your billing period.',
              },
              {
                q: 'How accurate is the AI matching?',
                a: 'Our AI scores each grant specifically against your charity\'s sector, size, location and work — not generic tags. Users report 90%+ accuracy.',
              },
              {
                q: 'Are the grants real and up to date?',
                a: 'Yes. We track 380+ active UK grant programmes and update deadlines regularly. Closed grants are removed automatically.',
              },
              {
                q: 'Do I need a charity number to sign up?',
                a: 'No. Registered charities get more grant matches, but unregistered community groups can use GrantRadar too.',
              },
            ].map((item) => (
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
