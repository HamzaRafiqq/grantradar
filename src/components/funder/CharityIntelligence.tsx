'use client'

import { useState, useEffect } from 'react'
import type { CCCharityProfile } from '@/app/api/charity-commission/[regNumber]/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}k`
  return `£${n.toLocaleString()}`
}

// ── Compact sparkline (tiny income history) ────────────────────────────────────

function Sparkline({ years }: { years: CCCharityProfile['financialYears'] }) {
  if (years.length === 0) return <div className="h-6 w-20 bg-gray-100 rounded" />
  const maxVal = Math.max(...years.map(y => y.incomeTotal), 1)
  const pts    = years.map((y, i) => {
    const x = (i / Math.max(years.length - 1, 1)) * 60
    const yv = 20 - (y.incomeTotal / maxVal) * 18
    return `${x},${yv}`
  }).join(' ')
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke="#0F4C35"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Health badge (compact) ─────────────────────────────────────────────────────

function BadgePill({ status, color }: { status: string; color: string }) {
  const s: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50 text-red-700 border-red-200',
  }
  const d: Record<string, string> = {
    green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${d[color]}`} />
      {status}
    </span>
  )
}

// ── Risk item ─────────────────────────────────────────────────────────────────

function RiskItem({ label, ok, warning }: { label: string; ok: boolean; warning?: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`flex-shrink-0 mt-0.5 ${ok ? 'text-green-500' : 'text-amber-500'}`}>
        {ok ? '✅' : '⚠️'}
      </span>
      <span className={ok ? 'text-gray-700' : 'text-amber-700'}>
        {label}
        {warning && <span className="text-gray-400"> — {warning}</span>}
      </span>
    </div>
  )
}

// ── Compact view (list context) ───────────────────────────────────────────────

export function CharityIntelligenceCompact({
  registrationNumber,
  charityName,
}: {
  registrationNumber: string
  charityName?: string
}) {
  const [data, setData]       = useState<CCCharityProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/charity-commission/${registrationNumber}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [registrationNumber])

  if (loading) return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
      <div className="w-12 h-3 bg-gray-100 rounded animate-pulse" />
    </div>
  )

  if (!data) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <BadgePill status={data.healthBadge} color={data.healthColor} />
      <Sparkline years={data.financialYears} />
      <span className="text-xs text-gray-600 font-semibold">{fmt(data.latestIncome)}</span>
      {data.fiveYearGrowth !== null && (
        <span className={`text-xs font-semibold ${data.fiveYearGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {data.fiveYearGrowth >= 0 ? '+' : ''}{data.fiveYearGrowth}% 5yr
        </span>
      )}
      {data.monthsOfReserves !== null && (
        <span className="text-xs text-gray-500">{data.monthsOfReserves}mo reserves</span>
      )}
    </div>
  )
}

// ── Full view (application detail) ───────────────────────────────────────────

interface FullProps {
  registrationNumber: string
  charityName?: string
  grantAmount?: number
  grantTitle?: string
}

export default function CharityIntelligence({
  registrationNumber,
  charityName,
  grantAmount,
  grantTitle,
}: FullProps) {
  const [data,    setData]    = useState<CCCharityProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [open,    setOpen]    = useState(false)

  async function load() {
    if (data || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/charity-commission/${registrationNumber}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? `HTTP ${res.status}`)
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

  const grantPct = data && grantAmount && data.latestIncome > 0
    ? ((grantAmount / data.latestIncome) * 100).toFixed(1)
    : null

  const grantRisk = grantPct !== null
    ? Number(grantPct) <= 10 ? 'low'
    : Number(grantPct) <= 30 ? 'medium'
    : 'high'
    : null

  // Risk checklist
  const risks = data ? [
    {
      label: `Income ${data.incomeTrend === 'growing' ? 'growing consistently' : data.incomeTrend === 'stable' ? 'broadly stable' : 'declining — review trend'}`,
      ok: data.incomeTrend !== 'declining',
    },
    {
      label: data.monthsOfReserves !== null
        ? `Reserves: ${data.monthsOfReserves} months ${data.monthsOfReserves >= 3 ? '(adequate)' : '(below recommended 3 months)'}`
        : 'Reserves data not available',
      ok: data.monthsOfReserves === null || data.monthsOfReserves >= 3,
    },
    {
      label: data.complianceScore !== null
        ? `Returns filed: ${data.complianceScore}% compliance rate`
        : 'Compliance data not available',
      ok: data.complianceScore === null || data.complianceScore >= 80,
      warning: data.complianceScore !== null && data.complianceScore < 80 ? 'late filings detected' : undefined,
    },
    {
      label: data.deficitYears === 0
        ? 'All years in surplus'
        : `${data.deficitYears} deficit year${data.deficitYears !== 1 ? 's' : ''} of ${data.totalYears}`,
      ok: data.deficitYears <= 2,
      warning: data.deficitYears > 2 ? 'review financial sustainability' : undefined,
    },
    {
      label: data.yearsOperating !== null
        ? `Operating ${data.yearsOperating} years (${data.yearsOperating >= 5 ? 'established' : 'relatively new'})`
        : 'Operating duration unknown',
      ok: data.yearsOperating === null || data.yearsOperating >= 5,
    },
    {
      label: `${data.trusteeCount} trustee${data.trusteeCount !== 1 ? 's' : ''} on record`,
      ok: data.trusteeCount >= 3,
      warning: data.trusteeCount < 3 ? 'below recommended minimum' : undefined,
    },
  ] : []

  const overallRisk = data
    ? risks.filter(r => !r.ok).length === 0 ? 'LOW'
    : risks.filter(r => !r.ok).length <= 2 ? 'MEDIUM'
    : 'HIGH'
    : null

  return (
    <div className="rounded-[12px] border border-gray-200 overflow-hidden">
      {/* Header — collapsible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F2ED] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5v3l2 2" stroke="#0F4C35" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#0D1117]">Charity Intelligence</p>
            <p className="text-xs text-gray-400">Financial health · Risk assessment · Source: Charity Commission</p>
          </div>
        </div>
        {data && !loading && (
          <BadgePill status={data.healthBadge} color={data.healthColor} />
        )}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-gray-400 transition-transform ml-2 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-white px-5 py-5 space-y-6">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <svg className="animate-spin text-[#0F4C35]" width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15"/>
              </svg>
              <p className="text-sm text-gray-400">Loading charity intelligence…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700">
                {error.includes('charity_not_found')
                  ? 'Charity not yet in local database. Run the CC import to populate.'
                  : 'Could not load financial intelligence data.'}
              </p>
              <button onClick={() => { setError(''); load() }} className="text-xs text-amber-600 underline mt-1">
                Retry
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-[#0D1117] text-base">{data.charityName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reg. {data.registrationNumber}
                    {data.yearsOperating !== null && ` · ${data.yearsOperating} years operating`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BadgePill status={data.healthBadge} color={data.healthColor} />
                  <p className="text-[10px] text-gray-400 max-w-[200px] text-right">{data.healthNote}</p>
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#E8F2ED] rounded-xl p-3 text-center">
                  <div className="font-bold text-base text-[#0F4C35]">
                    {data.latestIncome > 0 ? fmt(data.latestIncome) : '—'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Latest income</div>
                  {data.latestYear && <div className="text-[9px] text-gray-400">{data.latestYear}</div>}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`font-bold text-base ${data.fiveYearGrowth !== null && data.fiveYearGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {data.fiveYearGrowth !== null ? `${data.fiveYearGrowth >= 0 ? '+' : ''}${data.fiveYearGrowth}%` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">5-year growth</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-base text-[#0D1117]">
                    {data.monthsOfReserves !== null ? `${data.monthsOfReserves}mo` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Reserves</div>
                  {data.monthsOfReserves !== null && (
                    <div className={`text-[9px] ${data.monthsOfReserves >= 3 ? 'text-green-500' : 'text-amber-500'}`}>
                      {data.monthsOfReserves >= 3 ? '✅ Adequate' : '⚠️ Low'}
                    </div>
                  )}
                </div>
              </div>

              {/* Income sparkline */}
              {data.financialYears.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {data.financialYears.length}-Year Income Trend
                  </p>
                  <div className="flex items-end gap-0.5 h-12">
                    {data.financialYears.map(y => {
                      const maxV = Math.max(...data.financialYears.map(fy => fy.incomeTotal), 1)
                      const h = Math.max((y.incomeTotal / maxV) * 100, 4)
                      return (
                        <div
                          key={y.year}
                          className="flex-1 rounded-t-sm"
                          style={{
                            height: `${h}%`,
                            backgroundColor: y.isSurplus ? '#0F4C35' : '#FCA5A5',
                            opacity: 0.8,
                          }}
                          title={`${y.year}: ${fmt(y.incomeTotal)}`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {data.financialYears.map(y => (
                      <div key={y.year} className="flex-1 text-center text-[8px] text-gray-400 truncate">
                        {y.year.split('-')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grant in context */}
              {grantAmount !== undefined && grantPct !== null && (
                <div className="bg-[#E8F2ED] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[#0F4C35] uppercase tracking-wide mb-2">
                    📊 THIS GRANT IN CONTEXT
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#0D1117]">{fmt(grantAmount)} requested</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      grantRisk === 'low' ? 'bg-green-100 text-green-700' :
                      grantRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {grantPct}% of income
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {grantRisk === 'low' && `${grantPct}% of their annual income. Low dependency risk — well within the recommended 30% threshold.`}
                    {grantRisk === 'medium' && `${grantPct}% of their annual income. Notable portion — consider impact if grant is not renewed.`}
                    {grantRisk === 'high' && `${grantPct}% of their annual income. High dependency risk — over 30% threshold. Consider staged payments or co-funding requirements.`}
                  </p>
                  {/* Visual bar */}
                  <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        grantRisk === 'low' ? 'bg-green-500' : grantRisk === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Number(grantPct), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>0%</span><span>30%</span><span>100%</span>
                  </div>
                </div>
              )}

              {/* Risk assessment */}
              {risks.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Risk Assessment</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      overallRisk === 'LOW'  ? 'bg-green-100 text-green-700' :
                      overallRisk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {overallRisk} RISK
                    </span>
                  </div>
                  <div className="space-y-2">
                    {risks.map((r, i) => (
                      <RiskItem key={i} label={r.label} ok={r.ok} warning={r.warning} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {data.aiSummary && (
                <div className="bg-[#0F4C35] rounded-xl p-4">
                  <p className="text-[10px] font-bold text-[#00C875] uppercase tracking-wide mb-2">✦ AI ANALYSIS</p>
                  <p className="text-sm text-white/90 leading-relaxed">&quot;{data.aiSummary}&quot;</p>
                </div>
              )}

              {/* Trustees */}
              {data.trustees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Trustees ({data.trusteeCount})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.trustees.slice(0, 8).map(t => (
                      <span
                        key={t.name}
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          t.isChair ? 'bg-[#E8F2ED] text-[#0F4C35] font-semibold' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {t.name}{t.isChair && ' ★'}
                      </span>
                    ))}
                    {data.trustees.length > 8 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
                        +{data.trustees.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Geographic areas */}
              {data.geographicAreas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Areas of Operation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.geographicAreas.slice(0, 8).map(area => (
                      <span key={area} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                        {area}
                      </span>
                    ))}
                    {data.geographicAreas.length > 8 && (
                      <span className="text-xs text-gray-400">+{data.geographicAreas.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-300 text-center">
                Source: Charity Commission for England &amp; Wales · Updated weekly · May lag 12–18 months
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
