'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface Props {
  open: boolean
  onClose: () => void
  funderType: string
  amount: number
  score: number
  currency?: string
  triggerType: 'funder_name' | 'deadline' | 'apply_link'
}

function formatAmount(amount: number, currency = 'GBP'): string {
  if (!amount || amount === 0) return 'funding'
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' '
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}m`
  if (amount >= 1_000) return `${sym}${Math.round(amount / 1000)}k`
  return `${sym}${amount.toLocaleString()}`
}

const TRIGGER_COPY: Record<string, string> = {
  funder_name: 'See the funder name and research this opportunity',
  deadline: 'See the exact deadline so you can plan your application',
  apply_link: 'Access the application link and apply directly',
}

export default function UpgradeModal({ open, onClose, funderType, amount, score, currency, triggerType }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const amountStr = formatAmount(amount, currency)
  const action = TRIGGER_COPY[triggerType] ?? 'unlock this grant'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Lock icon */}
        <div className="w-12 h-12 rounded-full bg-[#0F4C35]/10 flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="4" y="10" width="14" height="10" rx="2.5" stroke="#0F4C35" strokeWidth="1.75"/>
            <path d="M7.5 10V8a3.5 3.5 0 017 0v2" stroke="#0F4C35" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h2 className="font-display font-bold text-[#0D1117] text-lg leading-snug">
            Unlock this grant
          </h2>
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
            This <span className="font-medium text-[#0D1117]">{funderType}</span> is offering up to{' '}
            <span className="font-medium text-[#0D1117]">{amountStr}</span> and you&apos;re a{' '}
            <span className="font-medium text-[#0F4C35]">{score}/10 match</span>.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Upgrade to {action}.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-2 bg-[#F4F6F5] rounded-xl p-4">
          {[
            '✓ Full funder names & websites',
            '✓ Exact deadlines',
            '✓ Direct application links',
            '✓ All matched grants (no limit)',
          ].map(f => (
            <li key={f} className="text-xs text-[#0D1117] font-medium">{f}</li>
          ))}
        </ul>

        {/* CTAs */}
        <Link
          href="/pricing"
          className="w-full bg-[#0F4C35] text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-[#0c3d2a] transition-colors text-center"
        >
          Upgrade to Starter — £9/month
        </Link>
        <button
          onClick={onClose}
          className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 transition-colors"
        >
          Maybe later
        </button>

        <p className="text-[10px] text-gray-400 text-center -mt-2">
          7-day free trial · Cancel anytime
        </p>
      </div>
    </div>
  )
}
