'use client'

import { useState } from 'react'
import Link from 'next/link'

const proFeatures = [
  'Unlimited matched grants',
  'AI application drafts',
  'Deadline alert emails',
  'Pipeline kanban board',
  'Weekly digest emails',
  'Priority support',
]

const freeFeatures = [
  '3 matched grants',
  'Eligibility scoring',
  'Basic deadline view',
  'Grant tracking',
]

export default function PricingToggle() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
            !isAnnual
              ? 'bg-[#0F4C35] text-white border-[#0F4C35]'
              : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${
            isAnnual
              ? 'bg-[#0F4C35] text-white border-[#0F4C35]'
              : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
          }`}
        >
          Annual — save 20%
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8 text-left">
        {/* Free */}
        <div className="card flex flex-col" style={{ paddingBottom: '2.5rem' }}>
          <div className="font-display text-2xl font-bold text-[#0D1117] mb-1">Free</div>
          <div className="text-gray-400 text-sm mb-6">Forever, no credit card</div>
          <div className="text-4xl font-bold text-[#0D1117] mb-6">
            £0<span className="text-lg font-normal text-gray-400">/mo</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#E8F2ED"/>
                  <path d="M5 8l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="border-2 border-[#0F4C35] text-[#0F4C35] px-6 py-3 rounded-xl font-medium hover:bg-[#E6FAF2] transition-colors duration-200 inline-flex items-center justify-center gap-2 text-sm w-full"
          >
            Get started free
          </Link>
        </div>

        {/* Pro */}
        <div className="card border-2 border-[#0F4C35] relative flex flex-col">
          <div className="absolute -top-3 left-6">
            <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
          </div>
          <div className="font-display text-2xl font-bold text-[#0D1117] mb-1">Pro</div>
          <div className="text-gray-400 text-sm mb-6">Everything you need to win grants</div>
          <div className="text-4xl font-bold text-[#0D1117] mb-1">
            {isAnnual ? '£39' : '£49'}<span className="text-lg font-normal text-gray-400">/mo</span>
          </div>
          <p className="text-[#0F4C35] text-[0.82rem] font-medium italic mb-6">
            💡 One grant win = 2 years of GrantRadar paid
          </p>
          <ul className="space-y-3 mb-8 flex-1">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#E8F2ED"/>
                  <path d="M5 8l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="btn-primary text-sm justify-center w-full py-3">
            Get Pro — {isAnnual ? '£39' : '£49'}/mo
          </Link>
        </div>
      </div>
    </div>
  )
}
