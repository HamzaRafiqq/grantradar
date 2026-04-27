'use client'

import { useState, useEffect } from 'react'
import type { CCCharityProfile, CCFinancialYear } from '@/app/api/charity-commission/[regNumber]/route'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}k`
  return `£${n.toLocaleString()}`
}

function fmtPct(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : ''}${n}%`
}

// ── Health Badge ──────────────────────────────────────────────────────────────

function HealthBadge({ status, color, note }: { status: string; color: string; note: string }) {
  const styles: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border border-green-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red:   'bg-red-50 text-red-700 border border-red-200',
  }
  const dots: Record<string, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red:   'bg-red-500',
  }
  return (
    <div>
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${styles[color]}`}>
        <span className={`w-2 h-2 rounded-full ${dots[color]}`} />
        {status}
      </span>
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{note}</p>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, highlight, trend
}: {
  label: string; value: string; sub?: string; highlight?: boolean; trend?: 'up' | 'down' | 'neutral'
}) {
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : ''
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-[#E8F2ED]' : 'bg-gray-50'}`}>
      <div className={`font-bold text-xl leading-tight ${highlight ? 'text-[#0F4C35]' : 'text-[#0D1117]'}`}>
        {value} {trendIcon && <span className={`text-sm ${trendColor}`}>{trendIcon}</span>}
      </div>
      <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Income Bar Chart (CSS) ─────────────────────────────────────────────────────

const CHART_PX = 144 // matches h-36

function IncomeBarChart({ years }: { years: CCFinancialYear[] }) {
  const maxVal = Math.max(...years.map(y => Math.max(y.incomeTotal, y.expenditureTotal)), 1)
  return (
    <div>
      {/* Use explicit px heights so percentage calc works inside flex items-end */}
      <div className="flex items-end gap-1" style={{ height: CHART_PX }}>
        {years.map(y => {
          const incH = Math.max((y.incomeTotal / maxVal) * CHART_PX, 3)
          const expH = y.expenditureTotal > 0
            ? Math.max((y.expenditureTotal / maxVal) * CHART_PX, 3)
            : 0
          return (
            <div key={y.year} className="flex-1 flex items-end justify-center gap-0.5 group relative" style={{ height: CHART_PX }}>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                <div className="font-semibold mb-0.5">{y.year}</div>
                <div className="text-green-400">Income: {fmt(y.incomeTotal)}</div>
                {y.expenditureTotal > 0 && <div className="text-red-300">Expend: {fmt(y.expenditureTotal)}</div>}
                <div className={y.isSurplus ? 'text-green-300' : 'text-red-400'}>
                  Net: {y.netIncome >= 0 ? '+' : ''}{fmt(y.netIncome)}
                </div>
              </div>
              {/* Income bar */}
              <div
                className="w-[45%] rounded-t-sm transition-all duration-300"
                style={{
                  height: `${incH}px`,
                  backgroundColor: y.isSurplus ? '#0F4C35' : '#6B7280',
                  opacity: 0.85,
                }}
              />
              {/* Expenditure bar — only shown if data available */}
              {expH > 0 && (
                <div
                  className="w-[45%] rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${expH}px`,
                    backgroundColor: y.isSurplus ? '#86EFAC' : '#FCA5A5',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      {/* X-axis */}
      <div className="flex gap-1 mt-1.5">
        {years.map(y => (
          <div key={y.year} className="flex-1 text-center text-[9px] text-gray-400 truncate">
            {y.year.split('-')[0]}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#0F4C35]" />
          <span className="text-[10px] text-gray-400">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#86EFAC]" />
          <span className="text-[10px] text-gray-400">Expenditure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#FCA5A5]" />
          <span className="text-[10px] text-gray-400">Deficit year</span>
        </div>
      </div>
    </div>
  )
}

// ── Stacked Income Breakdown ───────────────────────────────────────────────────

const BREAKDOWN_PX = 128 // matches h-32

function IncomeBreakdownChart({ years }: { years: CCFinancialYear[] }) {
  const maxVal = Math.max(...years.map(y => y.incomeTotal), 1)

  // Check if breakdown data exists for any year
  const hasBreakdown = years.some(y =>
    y.incomeDonations > 0 || y.incomeCharitable > 0 || y.incomeTrading > 0 || y.incomeInvestments > 0
  )

  if (!hasBreakdown) {
    // Fallback: plain income bar chart when breakdown isn't in the CC data
    return (
      <div>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          Income source breakdown not available in CC bulk data — showing total income only.
        </p>
        <div className="flex items-end gap-1" style={{ height: BREAKDOWN_PX }}>
          {years.map(y => {
            const h = Math.max((y.incomeTotal / maxVal) * BREAKDOWN_PX, 3)
            return (
              <div key={y.year} className="flex-1 flex items-end justify-center group relative" style={{ height: BREAKDOWN_PX }}>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  <div className="font-semibold">{y.year}</div>
                  <div className="text-green-400">Income: {fmt(y.incomeTotal)}</div>
                </div>
                <div className="w-full rounded-t-sm" style={{ height: `${h}px`, backgroundColor: '#0F4C35', opacity: 0.8 }} />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1 mt-1.5">
          {years.map(y => (
            <div key={y.year} className="flex-1 text-center text-[9px] text-gray-400 truncate">
              {y.year.split('-')[0]}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: BREAKDOWN_PX }}>
        {years.map(y => {
          const total = y.incomeTotal || 1
          const hPx   = Math.max((y.incomeTotal / maxVal) * BREAKDOWN_PX, 2)
          const segments = [
            { val: y.incomeDonations,  color: '#0F4C35', label: 'Donations & Legacies' },
            { val: y.incomeCharitable, color: '#16A34A', label: 'Charitable Activities' },
            { val: y.incomeTrading,    color: '#F59E0B', label: 'Trading' },
            { val: y.incomeInvestments,color: '#3B82F6', label: 'Investments' },
            { val: y.incomeOther,      color: '#9CA3AF', label: 'Other' },
          ]
          return (
            <div
              key={y.year}
              className="flex-1 flex flex-col-reverse rounded-t-sm overflow-hidden group relative"
              style={{ height: `${hPx}px` }}
            >
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0D1117] text-white text-[10px] rounded-lg px-2.5 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                <div className="font-semibold mb-0.5">{y.year}</div>
                {segments.filter(s => s.val > 0).map(s => (
                  <div key={s.label}>{s.label}: {fmt(s.val)}</div>
                ))}
              </div>
              {segments.map(seg => (
                <div
                  key={seg.label}
                  style={{
                    height:          `${(seg.val / total) * 100}%`,
                    backgroundColor: seg.color,
                    minHeight:       seg.val > 0 ? '1px' : '0',
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {years.map(y => (
          <div key={y.year} className="flex-1 text-center text-[9px] text-gray-400 truncate">
            {y.year.split('-')[0]}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {[
          { color: '#0F4C35', label: 'Donations & Legacies' },
          { color: '#16A34A', label: 'Charitable Activities' },
          { color: '#F59E0B', label: 'Trading' },
          { color: '#3B82F6', label: 'Investments' },
          { color: '#9CA3AF', label: 'Other' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Year-by-year Table ─────────────────────────────────────────────────────────

function YearTable({ years }: { years: CCFinancialYear[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-semibold">Year</th>
            <th className="text-right py-2 pr-4 font-semibold">Income</th>
            <th className="text-right py-2 pr-4 font-semibold">Expenditure</th>
            <th className="text-right py-2 pr-4 font-semibold">Net</th>
            <th className="text-right py-2 pr-4 font-semibold hidden sm:table-cell">Total Funds</th>
            <th className="text-left py-2 font-semibold hidden md:table-cell">Account Type</th>
          </tr>
        </thead>
        <tbody>
          {[...years].reverse().map(y => (
            <tr
              key={y.year}
              className={`border-b border-gray-50 ${y.isSurplus ? '' : 'bg-red-50/40'}`}
            >
              <td className="py-2 pr-4 font-medium text-gray-700">{y.year}</td>
              <td className="py-2 pr-4 text-right font-semibold text-[#0D1117]">{fmt(y.incomeTotal)}</td>
              <td className="py-2 pr-4 text-right text-gray-600">{fmt(y.expenditureTotal)}</td>
              <td className={`py-2 pr-4 text-right font-semibold ${y.isSurplus ? 'text-green-600' : 'text-red-500'}`}>
                {y.netIncome >= 0 ? '+' : ''}{fmt(y.netIncome)}
                {!y.isSurplus && ' ⚠️'}
              </td>
              <td className="py-2 pr-4 text-right text-gray-500 hidden sm:table-cell">
                {y.totalFunds ? fmt(y.totalFunds) : '—'}
              </td>
              <td className="py-2 text-gray-400 hidden md:table-cell">{y.accountType ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Compliance Section ─────────────────────────────────────────────────────────

function ComplianceSection({ returns, score }: { returns: CCCharityProfile['annualReturns']; score: number | null }) {
  const shown = returns.slice(0, 10)

  if (shown.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-6 text-center">
        <p className="text-sm text-gray-400">No filing history available yet.</p>
        <p className="text-xs text-gray-300 mt-1">Run the CC import to populate compliance data.</p>
      </div>
    )
  }

  return (
    <div>
      {score !== null && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 ${
          score >= 90 ? 'bg-green-50 text-green-700 border border-green-200' :
          score >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
          {score}% filing compliance
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left py-2 pr-3 font-semibold">Year end</th>
              <th className="text-left py-2 pr-3 font-semibold">Ref</th>
              <th className="text-left py-2 pr-3 font-semibold">Accounts</th>
              <th className="text-right py-2 pr-3 font-semibold">Due</th>
              <th className="text-right py-2 font-semibold">Filed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const yearEnd = r.periodEnd ? new Date(r.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
              const dueDate = r.dateRequired ? new Date(r.dateRequired).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
              const filedDate = r.dateReceived ? new Date(r.dateReceived).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
              return (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="py-2 pr-3 font-medium text-gray-700">{yearEnd}</td>
                  <td className="py-2 pr-3 text-gray-400">{r.cycleRef ?? '—'}</td>
                  <td className="py-2 pr-3">
                    {r.accountsType ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        r.accountsType === 'Qualified'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {r.accountsType}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-400">{dueDate}</td>
                  <td className="py-2 text-right">
                    {r.received === true && filedDate && (
                      <span className={`font-semibold ${r.filedOnTime ? 'text-green-600' : 'text-amber-600'}`}>
                        {filedDate} {r.filedOnTime ? '✅' : '⏰'}
                      </span>
                    )}
                    {r.received === true && !filedDate && (
                      <span className="text-green-600 font-semibold">✅ Received</span>
                    )}
                    {r.received === false && <span className="text-red-500 font-semibold">❌ Not received</span>}
                    {r.received === null && <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  registrationNumber: string
  /** Pre-loaded data (optional — avoids extra API call in server-rendered contexts) */
  initialData?: CCCharityProfile
}

export default function FinancialHistory({ registrationNumber, initialData }: Props) {
  const [data,    setData]    = useState<CCCharityProfile | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<'chart' | 'breakdown' | 'table' | 'compliance'>('chart')

  useEffect(() => {
    if (initialData) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/charity-commission/${registrationNumber}`)
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
    load()
  }, [registrationNumber, initialData])

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <svg className="animate-spin text-[#0F4C35]" width="32" height="32" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15"/>
        </svg>
        <p className="text-sm text-gray-400">Loading financial data from Charity Commission…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
        <p className="text-sm text-red-600">
          {error.includes('charity_not_found')
            ? 'This charity is not in our database yet. Run the import to load CC data.'
            : 'Could not load financial data.'}
        </p>
      </div>
    )
  }

  if (!data) return null

  const years = data.financialYears

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[#0D1117] text-lg">{data.charityName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Reg. {data.registrationNumber}
            {data.registrationStatus !== 'Registered' && (
              <span className="ml-2 text-red-500 font-semibold">• {data.registrationStatus}</span>
            )}
            {data.yearsOperating !== null && (
              <span className="ml-2 text-gray-400">• {data.yearsOperating} years operating</span>
            )}
          </p>
        </div>
        <HealthBadge status={data.healthBadge} color={data.healthColor} note={data.healthNote} />
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Latest Income"
          value={fmt(data.latestIncome)}
          sub={data.latestYear ?? undefined}
          highlight
          trend={data.incomeTrend === 'growing' ? 'up' : data.incomeTrend === 'declining' ? 'down' : 'neutral'}
        />
        <StatCard
          label="5-Year Growth"
          value={fmtPct(data.fiveYearGrowth)}
          sub="vs 5 years ago"
          trend={data.fiveYearGrowth !== null ? (data.fiveYearGrowth >= 0 ? 'up' : 'down') : undefined}
        />
        <StatCard
          label="Reserves"
          value={data.monthsOfReserves !== null ? `${data.monthsOfReserves} months` : '—'}
          sub={data.monthsOfReserves !== null ? (data.monthsOfReserves >= 3 ? 'Adequate ✅' : 'Low ⚠️') : 'Not available'}
        />
        <StatCard
          label="Deficit Years"
          value={`${data.deficitYears} of ${data.totalYears}`}
          sub={data.deficitYears === 0 ? 'All surplus years ✅' : `${data.deficitYears} year${data.deficitYears !== 1 ? 's' : ''} in deficit`}
        />
      </div>

      {/* Chart tabs */}
      {years.length > 0 && (
        <div>
          {/* Tab bar — scrollable on mobile */}
          <div className="flex gap-1 mb-4 p-1 bg-gray-50 rounded-xl overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {(['chart', 'breakdown', 'table', 'compliance'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                  tab === t ? 'bg-white text-[#0D1117] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'chart' ? 'Income vs Spend' :
                 t === 'breakdown' ? 'Income Mix' :
                 t === 'compliance' ? 'Filing History' :
                 'Year by Year'}
              </button>
            ))}
          </div>

          {tab === 'chart' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {years.length}-Year Income vs Expenditure
              </p>
              <IncomeBarChart years={years} />
            </div>
          )}

          {tab === 'breakdown' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Income Sources Breakdown
              </p>
              <IncomeBreakdownChart years={years} />
            </div>
          )}

          {tab === 'table' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Year by Year (most recent first)
              </p>
              <YearTable years={years} />
            </div>
          )}

          {tab === 'compliance' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Annual Return Filing History
              </p>
              <ComplianceSection returns={data.annualReturns} score={data.complianceScore} />
            </div>
          )}
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
          <div className="flex flex-wrap gap-2">
            {data.trustees.slice(0, 12).map(t => (
              <span
                key={t.name}
                className={`text-xs px-3 py-1 rounded-full ${t.isChair ? 'bg-[#E8F2ED] text-[#0F4C35] font-semibold' : 'bg-gray-100 text-gray-600'}`}
              >
                {t.name}{t.isChair && ' (Chair)'}
              </span>
            ))}
            {data.trustees.length > 12 && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-400">
                +{data.trustees.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Geographic areas */}
      {data.geographicAreas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Areas of Operation
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.geographicAreas.map(area => (
              <span key={area} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Other names */}
      {data.otherNames.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Previous Names</p>
          <div className="flex flex-wrap gap-2">
            {data.otherNames.map(n => (
              <span key={n.name} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                {n.name} <span className="text-gray-400">({n.nameType})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linked charities */}
      {data.linkedCharities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Linked Charities ({data.linkedCharities.length})
          </p>
          <div className="space-y-1">
            {data.linkedCharities.slice(0, 5).map(l => (
              <div key={l.number} className="text-xs text-gray-600">
                {l.name ?? l.number} <span className="text-gray-400">({l.number})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-300 text-center">
        Source: Charity Commission for England &amp; Wales · Data updated weekly · May lag 12–18 months
      </p>
    </div>
  )
}
