'use client'

import { useState } from 'react'
import Link from 'next/link'

const freeFeatures    = ['3 matched grants', 'Eligibility scoring', 'Match reason from AI', 'Basic deadline view']
const starterFeatures = ['Unlimited grant views', 'Full funder details', 'Deadline reminder emails', 'Basic tracker (save 25)']
const proFeatures     = ['Unlimited matched grants', 'AI application drafts', 'Deadline alert emails', 'Pipeline kanban board', 'Weekly digest emails', 'Priority support']
const agencyFeatures  = ['Everything in Pro', 'Up to 10 charity profiles', '3 team member seats', 'Bulk grant matching', 'White-label PDF reports', 'Dedicated onboarding call']

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <circle cx="8" cy="8" r="7" fill="#E8F2ED"/>
      <path d="M5 8l2 2 4-4" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <circle cx="8" cy="8" r="7" fill="#F3F4F6"/>
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function PricingToggle() {
  const [isAnnual, setIsAnnual] = useState(false)

  const starterPrice = isAnnual ? 7  : 9
  const proPrice     = isAnnual ? 39 : 49
  const agencyPrice  = isAnnual ? 79 : 99

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <button
          onClick={() => setIsAnnual(false)}
          className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors ${!isAnnual ? 'bg-[#0F4C35] text-white border-[#0F4C35]' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setIsAnnual(true)}
          className={`px-5 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${isAnnual ? 'bg-[#0F4C35] text-white border-[#0F4C35]' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}
        >
          Annual
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAnnual ? 'bg-[#00C875] text-[#0D1117]' : 'bg-green-100 text-green-700'}`}>Save 20%</span>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">

        {/* Free */}
        <div className="card flex flex-col">
          <div className="font-display text-xl font-bold text-[#0D1117] mb-1">Free</div>
          <div className="text-gray-400 text-xs mb-4">Forever, no credit card</div>
          <div className="text-3xl font-bold text-[#0D1117] mb-6">£0<span className="text-base font-normal text-gray-400">/mo</span></div>
          <ul className="space-y-2.5 mb-8 flex-1">
            {freeFeatures.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check />{f}</li>
            ))}
            {['AI drafts', 'Deadline alerts'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300"><Cross />{f}</li>
            ))}
          </ul>
          <Link href="/signup" className="border-2 border-[#0F4C35] text-[#0F4C35] px-4 py-2.5 rounded-xl font-medium hover:bg-[#E6FAF2] transition-colors duration-200 inline-flex items-center justify-center text-sm w-full">
            Get started free
          </Link>
        </div>

        {/* Starter */}
        <div className="card flex flex-col">
          <div className="font-display text-xl font-bold text-[#0D1117] mb-1">Starter</div>
          <div className="text-gray-400 text-xs mb-4">All grants, no AI tools</div>
          <div className="text-3xl font-bold text-[#0D1117] mb-1">£{starterPrice}<span className="text-base font-normal text-gray-400">/mo</span></div>
          {isAnnual && <p className="text-green-600 text-xs font-semibold mb-1">Save £18/year</p>}
          <p className="text-gray-400 text-xs mb-6">{isAnnual ? 'Billed £90/year' : 'Cancel any time'}</p>
          <ul className="space-y-2.5 mb-8 flex-1">
            {starterFeatures.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check />{f}</li>
            ))}
            {['AI drafts', 'Pipeline board'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300"><Cross />{f}</li>
            ))}
          </ul>
          <Link href="/pricing" className="border-2 border-[#0F4C35] text-[#0F4C35] px-4 py-2.5 rounded-xl font-medium hover:bg-[#E6FAF2] transition-colors duration-200 inline-flex items-center justify-center text-sm w-full">
            Get Starter — £{starterPrice}/mo
          </Link>
        </div>

        {/* Pro */}
        <div className="card border-2 border-[#0F4C35] relative flex flex-col">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">MOST POPULAR</span>
          </div>
          <div className="font-display text-xl font-bold text-[#0D1117] mb-1">Pro</div>
          <div className="text-gray-400 text-xs mb-4">Everything you need to win grants</div>
          <div className="text-3xl font-bold text-[#0D1117] mb-1">£{proPrice}<span className="text-base font-normal text-gray-400">/mo</span></div>
          {isAnnual && <p className="text-green-600 text-xs font-semibold mb-1">Save £118/year</p>}
          <p className="text-[#0F4C35] text-xs font-medium italic mb-6">💡 One grant win = 2 years paid</p>
          <ul className="space-y-2.5 mb-8 flex-1">
            {proFeatures.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check />{f}</li>
            ))}
          </ul>
          <Link href="/pricing" className="btn-primary text-sm justify-center w-full py-2.5">
            Get Pro — £{proPrice}/mo
          </Link>
        </div>

        {/* Agency */}
        <div className="card flex flex-col">
          <div className="font-display text-xl font-bold text-[#0D1117] mb-1">Agency</div>
          <div className="text-gray-400 text-xs mb-4">For consultants & multi-charity teams</div>
          <div className="text-3xl font-bold text-[#0D1117] mb-1">£{agencyPrice}<span className="text-base font-normal text-gray-400">/mo</span></div>
          {isAnnual && <p className="text-green-600 text-xs font-semibold mb-1">Save £240/year</p>}
          <p className="text-gray-400 text-xs mb-6">{isAnnual ? 'Billed £948/year' : '10 profiles · 3 seats'}</p>
          <ul className="space-y-2.5 mb-8 flex-1">
            {agencyFeatures.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check />{f}</li>
            ))}
          </ul>
          <Link href="/pricing" className="btn-primary text-sm justify-center w-full py-2.5">
            Get Agency — £{agencyPrice}/mo
          </Link>
        </div>

      </div>
    </div>
  )
}
