'use client'

import { useState } from 'react'

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
  { value: 'uk_wide',  label: 'UK-wide' },
  { value: 'england',  label: 'England only' },
  { value: 'scotland', label: 'Scotland only' },
  { value: 'wales',    label: 'Wales only' },
  { value: 'ni',       label: 'Northern Ireland only' },
  { value: 'london',   label: 'Greater London' },
  { value: 'regional', label: 'Specific regions' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FunderProfileForm({ profile }: { profile: any }) {
  const [form, setForm] = useState({
    org_name:         profile.org_name ?? '',
    org_type:         profile.org_type ?? 'foundation',
    website:          profile.website ?? '',
    description:      profile.description ?? '',
    annual_giving:    profile.annual_giving ?? '',
    geographic_focus: profile.geographic_focus ?? 'uk_wide',
  })
  const [focusAreas, setFocusAreas] = useState<string[]>(profile.focus_areas ?? [])
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

  function toggleArea(area: string) {
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/funder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, focus_areas: focusAreas }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSaving(false); return }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisation name</label>
        <input type="text" required className="input w-full" value={form.org_name}
          onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Organisation type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ORG_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, org_type: t.value }))}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left ${
                form.org_type === t.value ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
        <input type="url" className="input w-full" placeholder="https://yourfoundation.org" value={form.website}
          onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">About your organisation</label>
        <textarea rows={4} className="input w-full resize-none leading-relaxed" value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe what you fund and what makes a strong application…" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Total annual giving</label>
        <div className="grid grid-cols-2 gap-2">
          {ANNUAL_GIVING_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, annual_giving: opt.value }))}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                form.annual_giving === opt.value ? 'bg-[#0F2B4C] text-white border-[#0F2B4C]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Focus areas</label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map(area => (
            <button key={area} type="button" onClick={() => toggleArea(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                focusAreas.includes(area) ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}>
              {area}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Geographic focus</label>
        <select className="input w-full" value={form.geographic_focus}
          onChange={e => setForm(f => ({ ...f, geographic_focus: e.target.value }))}>
          {GEO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <button type="submit" disabled={saving}
        className="w-full py-3 bg-[#0F2B4C] text-white font-bold rounded-xl hover:bg-[#0a1f38] transition-colors disabled:opacity-60 text-sm">
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
      </button>
    </form>
  )
}
