'use client'

import { useState, useMemo, useEffect } from 'react'
import GrantCard from '@/components/ui/GrantCard'
import type { GrantMatchWithGrant } from '@/types'
import { daysUntil } from '@/lib/utils'

const CAUSE_AREAS = ['children', 'education', 'health', 'community', 'environment', 'arts', 'disability', 'elderly', 'housing', 'other']

const STORAGE_KEY = 'gr_dashboard_filters'

type SortOption = 'best' | 'deadline' | 'amount_high' | 'amount_low'
type AmountRange = 'any' | 'under5k' | '5k_25k' | '25k_100k' | 'over100k'
type DeadlineRange = 'any' | 'month' | '3months' | '6months'
type CountryScope = 'mine' | 'global' | 'all'

interface Filters {
  sort: SortOption
  amount: AmountRange
  causes: string[]
  deadline: DeadlineRange
  search: string
  countryScope: CountryScope
}

const defaultFilters: Filters = {
  sort: 'best',
  amount: 'any',
  causes: [],
  deadline: 'any',
  search: '',
  countryScope: 'mine',
}

function loadFilters(): Filters {
  if (typeof window === 'undefined') return defaultFilters
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...defaultFilters, ...JSON.parse(s) } : defaultFilters
  } catch { return defaultFilters }
}

function inAmountRange(max: number, range: AmountRange): boolean {
  if (range === 'any') return true
  if (range === 'under5k') return max > 0 && max < 5000
  if (range === '5k_25k') return max >= 5000 && max <= 25000
  if (range === '25k_100k') return max > 25000 && max <= 100000
  if (range === 'over100k') return max > 100000
  return true
}

function inDeadlineRange(deadline: string, range: DeadlineRange): boolean {
  if (range === 'any') return true
  const days = daysUntil(deadline)
  if (days <= 0) return false
  if (range === 'month') return days <= 30
  if (range === '3months') return days <= 90
  if (range === '6months') return days <= 180
  return true
}

interface Props {
  matches: GrantMatchWithGrant[]
  plan: string
  orgCountry?: string
}

export default function DashboardGrants({ matches, plan, orgCountry }: Props) {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [showClosed, setShowClosed] = useState(false)
  const [filtersLoaded, setFiltersLoaded] = useState(false)

  useEffect(() => {
    setFilters(loadFilters())
    setFiltersLoaded(true)
  }, [])

  useEffect(() => {
    if (filtersLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters, filtersLoaded])

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const openMatches = useMemo(
    () => matches.filter((m) => !m.grant.deadline || m.grant.deadline >= today),
    [matches, today]
  )
  const closedMatches = useMemo(
    () => matches.filter((m) => m.grant.deadline && m.grant.deadline < today),
    [matches, today]
  )

  const base = showClosed ? matches : openMatches

  const filtered = useMemo(() => {
    let result = [...base]

    // Country scope filter
    if (filters.countryScope === 'mine' && orgCountry) {
      result = result.filter(m =>
        m.grant.country === orgCountry ||
        m.grant.country === 'Global' ||
        m.grant.locations?.includes('Global') ||
        m.grant.locations?.includes('International')
      )
    } else if (filters.countryScope === 'global') {
      result = result.filter(m =>
        m.grant.country === 'Global' ||
        m.grant.locations?.includes('Global') ||
        m.grant.locations?.includes('International')
      )
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(m =>
        m.grant.name.toLowerCase().includes(q) ||
        m.grant.funder.toLowerCase().includes(q)
      )
    }

    if (filters.amount !== 'any') {
      result = result.filter(m => inAmountRange(m.grant.max_award, filters.amount))
    }

    if (filters.causes.length > 0) {
      result = result.filter(m =>
        m.grant.sectors?.some(s => filters.causes.includes(s))
      )
    }

    if (filters.deadline !== 'any') {
      result = result.filter(m => inDeadlineRange(m.grant.deadline, filters.deadline))
    }

    // Sort
    if (filters.sort === 'best') {
      result.sort((a, b) => b.eligibility_score - a.eligibility_score)
    } else if (filters.sort === 'deadline') {
      result.sort((a, b) => daysUntil(a.grant.deadline) - daysUntil(b.grant.deadline))
    } else if (filters.sort === 'amount_high') {
      result.sort((a, b) => b.grant.max_award - a.grant.max_award)
    } else if (filters.sort === 'amount_low') {
      result.sort((a, b) => a.grant.max_award - b.grant.max_award)
    }

    return result
  }, [base, filters])

  const isFiltered =
    filters.sort !== 'best' ||
    filters.amount !== 'any' ||
    filters.causes.length > 0 ||
    filters.deadline !== 'any' ||
    filters.search.trim() !== '' ||
    filters.countryScope !== 'all'

  function clearFilters() {
    setFilters(defaultFilters)
  }

  function toggleCause(cause: string) {
    setFilters(f => ({
      ...f,
      causes: f.causes.includes(cause)
        ? f.causes.filter(c => c !== cause)
        : [...f.causes, cause],
    }))
  }

  if (matches.length === 0) return null

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-4 mb-6 space-y-3">
        {/* Row 1: search full width */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.75"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search grants or funders..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
          />
        </div>

        {/* Row 2: selects — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{scrollbarWidth:'none'}}>
          <select
            value={filters.sort}
            onChange={e => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white flex-shrink-0"
          >
            <option value="best">Best match</option>
            <option value="deadline">Deadline ↑</option>
            <option value="amount_high">Amount ↓</option>
            <option value="amount_low">Amount ↑</option>
          </select>

          <select
            value={filters.amount}
            onChange={e => setFilters(f => ({ ...f, amount: e.target.value as AmountRange }))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white flex-shrink-0"
          >
            <option value="any">Any amount</option>
            <option value="under5k">Under £5k</option>
            <option value="5k_25k">£5k–£25k</option>
            <option value="25k_100k">£25k–£100k</option>
            <option value="over100k">Over £100k</option>
          </select>

          <select
            value={filters.deadline}
            onChange={e => setFilters(f => ({ ...f, deadline: e.target.value as DeadlineRange }))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white flex-shrink-0"
          >
            <option value="any">Any deadline</option>
            <option value="month">This month</option>
            <option value="3months">3 months</option>
            <option value="6months">6 months</option>
          </select>

          <select
            value={filters.countryScope}
            onChange={e => setFilters(f => ({ ...f, countryScope: e.target.value as CountryScope }))}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white flex-shrink-0"
          >
            <option value="all">All countries</option>
            {orgCountry && <option value="mine">My country</option>}
            <option value="global">Global only</option>
          </select>
        </div>

        {/* Row 2: cause area chips */}
        <div className="flex flex-wrap gap-2">
          {CAUSE_AREAS.map(cause => (
            <button
              key={cause}
              onClick={() => toggleCause(cause)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize border ${
                filters.causes.includes(cause)
                  ? 'bg-[#0F4C35] text-white border-[#0F4C35]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#0F4C35] hover:text-[#0F4C35]'
              }`}
            >
              {cause}
            </button>
          ))}
        </div>
      </div>

      {/* Result count + closed toggle */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-[#0D1117]">{filtered.length}</span> of{' '}
          <span className="font-semibold text-[#0D1117]">{base.length}</span> grant{base.length !== 1 ? 's' : ''}
          {isFiltered && (
            <button onClick={clearFilters} className="ml-2 text-[#0F4C35] hover:underline font-medium">
              Clear all filters
            </button>
          )}
          {!showClosed && closedMatches.length > 0 && (
            <span className="text-gray-400">
              {' '}·{' '}
              <button onClick={() => setShowClosed(true)} className="text-[#0F4C35] hover:underline font-medium">
                {closedMatches.length} closed hidden — show
              </button>
            </span>
          )}
        </p>
        {showClosed && closedMatches.length > 0 && (
          <button onClick={() => setShowClosed(false)} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Hide closed
          </button>
        )}
      </div>

      {/* Grant grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-semibold text-[#0D1117] text-sm mb-1">No grants match your filters</p>
          <p className="text-gray-400 text-xs mb-4">Try adjusting your filters or clearing them.</p>
          <button onClick={clearFilters} className="btn-primary text-sm py-2">Clear filters</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((match, i) => {
            const isLocked = plan === 'free' && i >= 3
            const lockedCount = plan === 'free' ? Math.max(0, filtered.length - 3) : 0
            return (
              <GrantCard
                key={match.id}
                match={match}
                isLocked={isLocked}
                lockedCount={lockedCount}
                plan={plan}
                orgCountry={orgCountry}
              />
            )
          })}
        </div>

      )}
    </div>
  )
}
