'use client'

import { useState, useEffect } from 'react'
import type { FinancialIntelligence, YearlyFinancial } from '@/app/api/charity-commission/financials/route'

const CHART_H = 120 // px — fixed pixel height avoids % flex issues

// ── Bar Chart (income + expenditure side-by-side) ─────────────────────────────

function IncomeBarChart({ years }: { years: YearlyFinancial[] }) {
  const maxVal = Math.max(...years.flatMap(y => [y.income, y.expenditure]), 1)

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
    return `£${n}`
  }

  return (
    <div className="mt-4">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#0F4C35]" />
          <span className="text-[10px] text-gray-400 font-medium">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          <span className="text-[10px] text-gray-400 font-medium">Expenditure</span>
        </div>
      </div>

      {/* Chart */}
      <div
        className="flex items-end gap-2"
        style={{ height: CHART_H }}
      >
        {years.map((y) => {
          const incH  = Math.max(Math.round((y.income / maxVal) * CHART_H), 3)
          const expH  = Math.max(Math.round((y.expenditure / maxVal) * CHART_H), 3)
          const isDeficit = y.surplus < 0

          return (
            <div key={y.year} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                <div className="font-semibold mb-0.5">{y.year}</div>
                <div className="text-green-400">Income: {fmt(y.income)}</div>
                <div className="text-red-300">Expenditure: {fmt(y.expenditure)}</div>
                <div className={isDeficit ? 'text-red-400' : 'text-green-400'}>
                  {isDeficit ? 'Deficit' : 'Surplus'}: {fmt(Math.abs(y.surplus))}
                </div>
              </div>

              {/* Bars pair */}
              <div className="flex items-end gap-0.5 w-full">
                {/* Income bar */}
                <div
                  className="flex-1 rounded-t transition-all duration-500"
                  style={{ height: incH, backgroundColor: '#0F4C35' }}
                />
                {/* Expenditure bar */}
                <div
                  className="flex-1 rounded-t transition-all duration-500"
                  style={{ height: expH, backgroundColor: isDeficit ? '#F87171' : '#86EFAC' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 mt-1.5">
        {years.map((y) => (
          <div key={y.year} className="flex-1 text-center text-[9px] text-gray-400 truncate leading-tight">
            {y.year === 'Unknown' ? y.endYear : y.year.split('-')[0]}
          </div>
        ))}
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
  const dots = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' }
  const c = color as 'green' | 'amber' | 'red'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${styles[c]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[c]}`} />
      {status}
    </span>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${warn ? 'bg-red-50' : highlight ? 'bg-[#E8F2ED]' : 'bg-gray-50'}`}>
      <div className={`font-bold text-base leading-tight ${warn ? 'text-red-600' : highlight ? 'text-[#0F4C35]' : 'text-[#0D1117]'}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

// ── Year row (income + expenditure + surplus/deficit) ─────────────────────────

function YearRow({ y }: { y: YearlyFinancial }) {
  const isDeficit = y.surplus < 0
  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `£${(Math.abs(n) / 1_000_000).toFixed(1)}m`
    if (Math.abs(n) >= 1_000) return `£${(Math.abs(n) / 1_000).toFixed(0)}k`
    return `£${Math.abs(n).toLocaleString()}`
  }
  return (
    <div className="grid grid-cols-4 items-center py-2.5 border-b border-gray-100 last:border-0 gap-2">
      <span className="text-xs font-semibold text-gray-600">
        {y.year === 'Unknown' ? y.endYear : y.year}
      </span>
      <span className="text-xs text-[#0D1117] font-medium text-right">{fmt(y.income)}</span>
      <span className="text-xs text-gray-500 text-right">{fmt(y.expenditure)}</span>
      <span className={`text-xs font-semibold text-right ${isDeficit ? 'text-red-500' : 'text-green-600'}`}>
        {isDeficit ? '▼' : '▲'} {fmt(y.surplus)}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  charityNumber: string
  charityName?: string
  grantAmount?: number
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

  const last5 = data
    ? [...data.years].sort((a, b) => (b.endYear || 0) - (a.endYear || 0)).slice(0, 5).reverse()
    : []

  const latestExpend = last5.length > 0 ? last5[last5.length - 1].expenditure : 0

  return (
    <div className="rounded-[12px] border border-gray-200 overflow-hidden">
      {/* Header */}
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

          {loading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <svg className="animate-spin text-[#0F4C35]" width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15"/>
              </svg>
              <p className="text-sm text-gray-400">Fetching financial history from Charity Commission…</p>
            </div>
          )}

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

          {data && !loading && (
            <div className="space-y-6">

              {/* Header */}
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
                <Stat label="Latest Expenditure" value={fmt(latestExpend)} warn={latestExpend > data.latestIncome} />
                <Stat
                  label="5-Year Growth"
                  value={`${data.fiveYearGrowth >= 0 ? '+' : ''}${data.fiveYearGrowth}%`}
                  highlight={data.fiveYearGrowth > 0}
                />
                <Stat
                  label="Deficit Years"
                  value={`${data.deficitYears} of ${data.totalYears}`}
                  warn={data.deficitYears > data.totalYears / 2}
                />
              </div>

              {grantAmount && data.latestIncome > 0 && (
                <Stat
                  label="Grant as % of Annual Income"
                  value={`${((grantAmount / data.latestIncome) * 100).toFixed(1)}%`}
                />
              )}

              {/* Bar chart */}
              {data.years.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {data.years.length}-Year Income vs Expenditure
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
                    Year by Year (last {last5.length})
                  </p>
                  <div className="bg-gray-50 rounded-xl px-4 py-1">
                    {/* Header */}
                    <div className="grid grid-cols-4 py-2 border-b border-gray-200 gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Year</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase text-right">Income</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase text-right">Expenditure</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase text-right">Net</span>
                    </div>
                    {last5.map(y => <YearRow key={y.year + y.endYear} y={y} />)}
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
