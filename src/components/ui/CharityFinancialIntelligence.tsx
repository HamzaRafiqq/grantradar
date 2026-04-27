'use client'

import { useState, useEffect } from 'react'
import type { FinancialIntelligence, YearlyFinancial } from '@/app/api/charity-commission/financials/route'

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function IncomeBarChart({ years }: { years: YearlyFinancial[] }) {
  const maxIncome = Math.max(...years.map(y => y.income), 1)

  return (
    <div className="mt-4">
      <div className="flex items-end gap-1.5 h-24">
        {years.map((y) => {
          const heightPct = Math.max((y.income / maxIncome) * 100, 4)
          const isDeficit = y.surplus < 0
          return (
            <div key={y.year} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                <div className="font-semibold">{y.year}</div>
                <div>£{(y.income / 1000).toFixed(0)}k income</div>
                <div className={y.surplus >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {y.surplus >= 0 ? '+' : ''}£{(y.surplus / 1000).toFixed(0)}k {y.surplus >= 0 ? 'surplus' : 'deficit'}
                </div>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isDeficit ? '#FCA5A5' : '#0F4C35',
                  opacity: isDeficit ? 1 : 0.85 + (heightPct / maxIncome) * 0.15,
                }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-1.5">
        {years.map((y) => (
          <div key={y.year} className="flex-1 text-center text-[9px] text-gray-400 truncate">
            {y.year.split('-')[0]}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#0F4C35]" />
          <span className="text-[10px] text-gray-400">Surplus year</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-300" />
          <span className="text-[10px] text-gray-400">Deficit year</span>
        </div>
      </div>
    </div>
  )
}

// ── Health badge ──────────────────────────────────────────────────────────────

function HealthBadge({ status, color }: { status: string; color: string }) {
  const styles = {
    green: 'bg-green-50 text-green-700 border border-green-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red:   'bg-red-50 text-red-700 border border-red-200',
  }
  const dots = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red:   'bg-red-500',
  }
  const c = color as 'green' | 'amber' | 'red'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${styles[c]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[c]}`} />
      {status}
    </span>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-[#E8F2ED]' : 'bg-gray-50'}`}>
      <div className={`font-bold text-base leading-tight ${highlight ? 'text-[#0F4C35]' : 'text-[#0D1117]'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

// ── Year row ──────────────────────────────────────────────────────────────────

function YearRow({ y }: { y: YearlyFinancial }) {
  const isDeficit = y.surplus < 0
  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
    return `£${(Math.abs(n) / 1000).toFixed(0)}k`
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 w-16">{y.year}</span>
      <span className="text-xs font-semibold text-[#0D1117]">{fmt(y.income)}</span>
      <span className={`text-xs font-semibold ${isDeficit ? 'text-red-500' : 'text-green-600'}`}>
        {isDeficit ? '-' : '+'}{fmt(Math.abs(y.surplus))} {isDeficit ? '⚠️' : '✅'}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  charityNumber: string
  charityName?: string
  grantAmount?: number   // optional — shows "grant in context" section
}

export default function CharityFinancialIntelligence({ charityNumber, charityName, grantAmount }: Props) {
  const [data,    setData]    = useState<FinancialIntelligence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [open,    setOpen]    = useState(false)

  async function load() {
    if (data || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/charity-commission/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charityNumber, charityName, grantAmount }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? `Error ${res.status}`)
      }
      setData(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
    return `£${n.toLocaleString()}`
  }

  const last5 = data ? [...data.years].sort((a, b) => b.endYear - a.endYear).slice(0, 5) : []

  return (
    <div className="rounded-[12px] border border-gray-200 overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F2ED] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="8" width="3" height="7" rx="1" fill="#0F4C35"/>
              <rect x="6" y="5" width="3" height="10" rx="1" fill="#0F4C35"/>
              <rect x="11" y="2" width="3" height="13" rx="1" fill="#00C875"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#0D1117]">Charity Financial Intelligence</p>
            <p className="text-xs text-gray-400">10-year income history · AI analysis · Source: Charity Commission</p>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expandable panel */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-5 py-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <svg className="animate-spin text-[#0F4C35]" width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15"/>
              </svg>
              <p className="text-sm text-gray-400">Fetching financial history from Charity Commission…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-sm text-red-600 mb-2">
                {error.includes('charity_not_found')
                  ? 'Charity not found on the Charity Commission register.'
                  : error.includes('CC API not configured')
                  ? 'Charity Commission API is not configured on this server.'
                  : 'Could not load financial data. The charity may not file annual returns online.'}
              </p>
              <button onClick={() => { setError(''); load() }} className="text-xs text-red-500 underline">
                Try again
              </button>
            </div>
          )}

          {/* Data */}
          {data && !loading && (
            <div className="space-y-6">

              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-[#0D1117] text-base">{data.charityName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Reg: {data.regNumber}</p>
                </div>
                <HealthBadge status={data.healthStatus} color={data.healthColor} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Latest Income" value={fmt(data.latestIncome)} highlight />
                <Stat
                  label="5-Year Growth"
                  value={`${data.fiveYearGrowth >= 0 ? '+' : ''}${data.fiveYearGrowth}%`}
                  highlight={data.fiveYearGrowth > 0}
                />
                <Stat
                  label="Deficit Years"
                  value={`${data.deficitYears} of ${data.totalYears}`}
                />
                {grantAmount && data.latestIncome > 0 && (
                  <Stat
                    label="Grant as % Income"
                    value={`${((grantAmount / data.latestIncome) * 100).toFixed(1)}%`}
                  />
                )}
              </div>

              {/* Bar chart */}
              {data.years.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {data.years.length}-Year Income History
                  </p>
                  <IncomeBarChart years={data.years} />
                </div>
              )}

              {/* AI Summary */}
              {data.aiSummary && (
                <div className="bg-[#0F4C35] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[#00C875] uppercase tracking-wide mb-2">
                    ✦ AI SUMMARY
                  </p>
                  <p className="text-sm text-white/90 leading-relaxed">&quot;{data.aiSummary}&quot;</p>
                </div>
              )}

              {/* Grant in context */}
              {data.grantContext && grantAmount && (
                <div className="bg-[#E8F2ED] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[#0F4C35] uppercase tracking-wide mb-1.5">
                    📊 THIS GRANT IN CONTEXT
                  </p>
                  <p className="text-sm text-[#0D1117] leading-relaxed">
                    <span className="font-semibold">{fmt(grantAmount)}</span> = {((grantAmount / data.latestIncome) * 100).toFixed(1)}% of their annual income.{' '}
                    {data.grantContext}
                  </p>
                </div>
              )}

              {/* Year-by-year table */}
              {last5.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Year by Year (last 5)
                  </p>
                  <div className="bg-gray-50 rounded-xl px-4 py-2">
                    {last5.map(y => <YearRow key={y.year} y={y} />)}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-300 text-center">
                Source: Charity Commission for England &amp; Wales · Data may lag by 12-18 months
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
