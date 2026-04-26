'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ORG_TYPES = [
  { value: 'trust',       label: 'Charitable Trust' },
  { value: 'foundation',  label: 'Foundation' },
  { value: 'corporate',   label: 'Corporate Foundation' },
  { value: 'government',  label: 'Government / Public Body' },
  { value: 'lottery',     label: 'Lottery Distributor' },
  { value: 'other',       label: 'Other' },
]

const ANNUAL_GIVING_OPTIONS = [
  { value: 'under_100k', label: 'Under £100,000' },
  { value: '100k_1m',    label: '£100,000 – £1 million' },
  { value: '1m_10m',     label: '£1 million – £10 million' },
  { value: 'over_10m',   label: 'Over £10 million' },
]

const FOCUS_AREAS = [
  'Arts & Culture', 'Children & Youth', 'Community Development', 'Disability',
  'Education', 'Environment', 'Health & Wellbeing', 'Homelessness', 'Mental Health',
  'Older People', 'Poverty & Inequality', 'Sport & Recreation', 'Wildlife & Nature',
]

const GEO_OPTIONS = [
  { value: 'uk_wide',   label: 'UK-wide' },
  { value: 'england',   label: 'England only' },
  { value: 'scotland',  label: 'Scotland only' },
  { value: 'wales',     label: 'Wales only' },
  { value: 'ni',        label: 'Northern Ireland only' },
  { value: 'london',    label: 'Greater London' },
  { value: 'regional',  label: 'Specific regions' },
]

export default function FunderOnboardingPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    org_name:         '',
    org_type:         'foundation',
    website:          '',
    description:      '',
    annual_giving:    '',
    geographic_focus: 'uk_wide',
  })
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  function toggleArea(area: string) {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.org_name.trim()) { setError('Organisation name is required'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/funder/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, focus_areas: focusAreas }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/funder/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0F2B4C] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#60A5FA" strokeWidth="2"/>
                <circle cx="9" cy="9" r="3" fill="#60A5FA"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-[#0F2B4C]">FundsRadar</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-[#0D1117]">Set up your funder profile</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Tell us about your organisation so charities know who you are.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">

          {/* Org name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Organisation name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              className="input w-full"
              placeholder="The Hartley Foundation"
              value={form.org_name}
              onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))}
            />
          </div>

          {/* Org type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisation type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ORG_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, org_type: t.value }))}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left ${
                    form.org_type === t.value
                      ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
            <input
              type="url"
              className="input w-full"
              placeholder="https://yourfoundation.org"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              About your organisation
            </label>
            <textarea
              rows={4}
              className="input w-full resize-none leading-relaxed"
              placeholder="Describe what you fund, your mission, and what makes a strong application…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Annual giving */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total annual giving</label>
            <div className="grid grid-cols-2 gap-2">
              {ANNUAL_GIVING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, annual_giving: opt.value }))}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.annual_giving === opt.value
                      ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus areas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Focus areas <span className="text-gray-400 font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    focusAreas.includes(area)
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Geographic focus */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Geographic focus</label>
            <select
              className="input w-full"
              value={form.geographic_focus}
              onChange={e => setForm(f => ({ ...f, geographic_focus: e.target.value }))}
            >
              {GEO_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0F2B4C] text-white font-bold rounded-xl hover:bg-[#0a1f38] transition-colors disabled:opacity-60 text-sm"
          >
            {loading ? 'Saving…' : 'Continue to dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )
}
