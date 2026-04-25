'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { GrantMatchWithGrant, MatchStatus } from '@/types'
import { formatDate, daysUntil, scoreColor, deadlineColor } from '@/lib/utils'
import { getLocale, formatDateLocale, formatLocalAmount } from '@/lib/locale'
import { createClient } from '@/lib/supabase/client'

const statusOptions: { value: MatchStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'researching', label: 'Researching', color: 'bg-purple-100 text-purple-700' },
  { value: 'applying', label: 'Applying', color: 'bg-amber-100 text-amber-700' },
  { value: 'submitted', label: 'Submitted', color: 'bg-orange-100 text-orange-700' },
  { value: 'won', label: 'Won 🎉', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-500' },
]

const STATUS_COLOR: Record<MatchStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  researching: 'bg-purple-100 text-purple-700',
  applying: 'bg-amber-100 text-amber-700',
  submitted: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-500',
}

const COUNTRY_FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧',
  'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'India': '🇮🇳',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',
  'Ireland': '🇮🇪',
  'New Zealand': '🇳🇿',
  'South Africa': '🇿🇦',
  'Nigeria': '🇳🇬',
  'Kenya': '🇰🇪',
  'Brazil': '🇧🇷',
  'Japan': '🇯🇵',
  'Global': '🌍',
}

function countryFlag(country?: string) {
  if (!country) return null
  return COUNTRY_FLAGS[country] ?? '🌐'
}

function DeadlineBadge({ days }: { days: number }) {
  if (days <= 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Closed</span>
  if (days <= 7) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">🔴 {days}d left</span>
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🟡 {days}d left</span>
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">🟢 {days}d left</span>
}

interface Props {
  match: GrantMatchWithGrant
  isLocked?: boolean
  plan?: string
  orgCountry?: string
}

export default function GrantCard({ match, isLocked = false, plan = 'free', orgCountry }: Props) {
  const [status, setStatus] = useState<MatchStatus>(match.status as MatchStatus)
  const [expanded, setExpanded] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const days = daysUntil(match.grant.deadline)
  const supabase = createClient()
  const locale = getLocale(orgCountry)
  const grantCurrency = match.grant.currency ?? 'GBP'

  const isNew = match.created_at
    ? (Date.now() - new Date(match.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  async function updateStatus(newStatus: MatchStatus) {
    setStatus(newStatus)
    await supabase.from('grant_matches').update({ status: newStatus }).eq('id', match.id)
  }

  async function generateDraft() {
    setDrafting(true)
    setDraft(null)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId: match.grant_id }),
      })
      const data = await res.json()
      setDraft(data.draft ?? 'Could not generate draft.')
    } catch {
      setDraft('Could not generate draft.')
    }
    setDrafting(false)
  }

  async function copyDraft() {
    if (!draft) return
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Anonymise for free/starter users when public variants are available
  const isAnon = (plan === 'free' || plan === 'starter') && !!match.grant.public_title
  const displayName   = isAnon ? (match.grant.public_title ?? match.grant.name) : match.grant.name
  const displayFunder = isAnon ? 'A UK Funder' : match.grant.funder
  const displayDesc   = isAnon ? (match.grant.public_description ?? match.grant.description) : match.grant.description

  const eligibilityBullets = match.grant.eligibility_criteria
    ? match.grant.eligibility_criteria.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 10).slice(0, 3)
    : []

  const statusOpt = statusOptions.find(o => o.value === status)!

  return (
    <div className={`bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col transition-shadow hover:shadow-[0_6px_24px_rgba(0,0,0,0.10)] ${isLocked ? 'relative overflow-hidden' : ''}`}>
      {isLocked && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[14px] flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 rounded-full bg-[#0F4C35] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="9" width="12" height="9" rx="2" stroke="white" strokeWidth="1.75"/>
              <path d="M7 9V7a3 3 0 116 0v2" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-semibold text-sm text-[#0D1117] mb-1">Unlock this grant</p>
          <p className="text-gray-400 text-xs text-center px-4">Upgrade to see all matched grants</p>
          <Link href="/pricing" className="mt-3 bg-[#0F4C35] text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#0c3d2a] transition-colors">
            Upgrade — from £9/mo
          </Link>
        </div>
      )}

      {/* Top bar: status badge + NEW badge + score */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${STATUS_COLOR[status]}`}>
            {statusOpt?.label}
          </span>
          {isNew && status !== 'new' && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#00C875] text-[#0D1117] uppercase tracking-wide">
              NEW
            </span>
          )}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor(match.eligibility_score)}`}>
          {match.eligibility_score}/10 match
        </span>
      </div>

      {/* Main content */}
      <div className="px-5 pt-3 pb-4 flex flex-col gap-3">

        {/* Title + funder + deadline */}
        <div>
          <h3 className="font-display font-semibold text-[#0D1117] text-base leading-snug">
            {displayName}
            {isAnon && (
              <span className="ml-2 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full align-middle">
                Upgrade to reveal
              </span>
            )}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">{displayFunder}</p>
          <div className="flex items-center gap-2 mt-2">
            <DeadlineBadge days={days} />
            {match.grant.deadline && (
              <span className="text-xs text-gray-400">{formatDateLocale(match.grant.deadline, orgCountry)}</span>
            )}
          </div>
        </div>

        {/* Funding amount */}
        <div className="flex items-center gap-2 bg-[#F4F6F5] rounded-xl px-3 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#0F4C35" strokeWidth="2"/>
            <path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 010 3H10a1.5 1.5 0 000 3H15" stroke="#0F4C35" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#0F4C35]">
            {!match.grant.max_award || match.grant.max_award === 0
              ? 'Amount TBC'
              : (() => {
                  const maxAmt = formatLocalAmount(match.grant.max_award, grantCurrency, locale.currency, locale.currencySymbol)
                  const minAmt = match.grant.min_award > 0
                    ? formatLocalAmount(match.grant.min_award, grantCurrency, locale.currency, locale.currencySymbol)
                    : null
                  return (
                    <span>
                      {minAmt ? `${minAmt.primary} – ${maxAmt.primary}` : `Up to ${maxAmt.primary}`}
                      {maxAmt.secondary && (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">({maxAmt.secondary})</span>
                      )}
                    </span>
                  )
                })()
            }
          </span>
          <span className="text-xs text-gray-400 ml-auto">~2 hr application</span>
        </div>

        {/* Description */}
        {displayDesc && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{displayDesc}</p>
        )}

        {/* Sector + country tags */}
        <div className="flex flex-wrap gap-1.5">
          {match.grant.sectors?.map(s => (
            <span key={s} className="text-[10px] bg-[#E8F2ED] text-[#0F4C35] px-2 py-0.5 rounded-full font-medium capitalize">{s}</span>
          ))}
          {match.grant.country && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {countryFlag(match.grant.country)} {match.grant.country}
            </span>
          )}
          {!match.grant.country && match.grant.locations?.slice(0, 1).map(l => (
            <span key={l} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{l}</span>
          ))}
        </div>

        {/* Why you match */}
        <div className="bg-[#F4F6F5] rounded-xl p-3">
          <p className="text-xs font-semibold text-[#0F4C35] mb-1">Why you match</p>
          <p className="text-xs text-gray-600 leading-relaxed">{match.match_reason}</p>
        </div>

        {/* Watch out */}
        {match.watch_out && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Watch out</p>
            <p className="text-xs text-amber-600 leading-relaxed">{match.watch_out}</p>
          </div>
        )}

        {/* Expandable: eligibility criteria */}
        {eligibilityBullets.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#0F4C35] font-medium flex items-center gap-1 hover:underline"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {expanded ? 'Hide' : 'Show'} eligibility criteria
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {eligibilityBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-[#00C875] mt-0.5 flex-shrink-0">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* AI Draft */}
        {draft && (
          <div className="bg-[#F4F6F5] rounded-xl p-3 relative">
            <p className="text-xs font-semibold text-[#0F4C35] mb-1">AI opening paragraph</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{draft}</p>
            <button
              onClick={copyDraft}
              className="mt-2 text-xs text-[#0F4C35] font-medium hover:underline"
            >
              {copied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => updateStatus(e.target.value as MatchStatus)}
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {plan !== 'starter' && plan !== 'free' ? (
              <button
                onClick={generateDraft}
                disabled={drafting}
                className="flex-1 border border-[#0F4C35] text-[#0F4C35] text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-[#0F4C35] hover:text-white transition-colors disabled:opacity-50 text-center"
              >
                {drafting ? 'Writing...' : '✍️ AI Draft'}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="flex-1 border border-gray-200 text-gray-400 text-xs font-medium py-1.5 px-3 rounded-lg hover:border-[#0F4C35] hover:text-[#0F4C35] transition-colors text-center"
              >
                ✍️ AI Draft (Pro)
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/grants/${match.grant.id}`}
              className="flex-1 border border-gray-200 text-gray-600 text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              Full details
            </Link>
            {isAnon ? (
              <Link
                href="/pricing"
                className="flex-1 bg-[#0F4C35] text-white text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-[#0c3d2a] transition-colors text-center"
              >
                Upgrade to Apply →
              </Link>
            ) : match.grant.application_url ? (
              <a
                href={match.grant.application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#0F4C35] text-white text-xs font-medium py-1.5 px-3 rounded-lg hover:bg-[#0c3d2a] transition-colors text-center"
              >
                Apply Now →
              </a>
            ) : null}
          </div>
          {!isAnon && match.grant.application_url && (
            <p className="text-[10px] text-gray-400 text-center">
              Opens funder&apos;s website — search for this grant once there
            </p>
          )}
          {isAnon && (
            <p className="text-[10px] text-gray-400 text-center">
              Upgrade to Pro to reveal the funder and apply directly
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
