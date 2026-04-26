'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TrustScores } from '@/lib/trust-score'
import { CATEGORY_LABELS, trustScoreColor } from '@/lib/trust-score'

const CIRCUMFERENCE = 2 * Math.PI * 45  // ≈ 282.74

interface Props {
  total:        number
  scores:       TrustScores
  improvements: string[]
  recalculating?: boolean
  onRecalculate?: () => void
}

function CircularProgress({ score, color }: { score: number; color: string }) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    // Animate on mount
    const raf = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(raf)
  }, [score])

  const offset = CIRCUMFERENCE * (1 - animated / 100)

  return (
    <div className="relative w-36 h-36 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8"/>
        {/* Progress */}
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Score label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-3xl text-[#0D1117]">{score}</span>
        <span className="text-xs text-gray-400 font-medium">/ 100</span>
      </div>
    </div>
  )
}

function CategoryBar({ label, value, color }: { label: string; value: number; color: string }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(value * 5)) // max 20 → 100%
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600 font-medium whitespace-nowrap">{label}</span>
        <span className="text-xs font-bold text-[#0D1117] whitespace-nowrap ml-2">{value}<span className="text-gray-400 font-normal">/20</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}

function GradeBadge({ total }: { total: number }) {
  if (total >= 80) return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Excellent</span>
  if (total >= 50) return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Good</span>
  if (total >= 25) return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">Building</span>
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Starting out</span>
}

export default function TrustScore({ total, scores, improvements, recalculating, onRecalculate }: Props) {
  const { text, ring } = trustScoreColor(total)

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-[#0D1117] text-base">Trust Score</h2>
          <p className="text-gray-400 text-xs mt-0.5">Visible to funders on your profile</p>
        </div>
        <GradeBadge total={total} />
      </div>

      {/* Circle — centred */}
      <div className="flex justify-center mb-4">
        <CircularProgress score={total} color={ring} />
      </div>

      {/* Category bars — full width */}
      <div className="space-y-2.5 mb-5">
        {(Object.keys(scores) as (keyof TrustScores)[]).map(key => (
          <CategoryBar
            key={key}
            label={CATEGORY_LABELS[key]}
            value={scores[key]}
            color={ring}
          />
        ))}
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-xs font-semibold text-[#0D1117] mb-2.5">Improve your score</p>
          <ul className="space-y-2">
            {improvements.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                <span className={`font-bold flex-shrink-0 mt-0.5 ${text}`}>↑</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="flex-1 text-center text-xs font-semibold text-[#0F4C35] border border-[#0F4C35] py-2 px-3 rounded-xl hover:bg-[#0F4C35] hover:text-white transition-colors"
        >
          Improve score →
        </Link>
        {onRecalculate && (
          <button
            onClick={onRecalculate}
            disabled={recalculating}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 px-2 py-2"
            title="Recalculate"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={recalculating ? 'animate-spin' : ''}>
              <path d="M13.5 2.5A7 7 0 102.5 13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <path d="M13.5 2.5v4h-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
