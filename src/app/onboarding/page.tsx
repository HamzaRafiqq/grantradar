'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Sector, AnnualIncome } from '@/types'

// ── Country data ─────────────────────────────────────────────────────────────

const TOP_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'India',
  'Germany', 'France', 'Netherlands', 'Ireland', 'New Zealand',
]

const ALL_COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia',
  'Austria','Azerbaijan','Bahrain','Bangladesh','Belgium','Bolivia','Bosnia',
  'Botswana','Brazil','Bulgaria','Cambodia','Cameroon','Chile','China',
  'Colombia','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark',
  'Ecuador','Egypt','El Salvador','Estonia','Ethiopia','Finland','Georgia',
  'Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','Iceland',
  'Indonesia','Iran','Iraq','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Latvia','Lebanon',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Malaysia','Malta',
  'Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nepal','Nicaragua','Nigeria','North Macedonia',
  'Norway','Oman','Pakistan','Palestine','Panama','Paraguay','Peru',
  'Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia',
  'South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden',
  'Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand',
  'Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','Uruguay',
  'Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

const COUNTRIES = [...new Set([...TOP_COUNTRIES, ...ALL_COUNTRIES])].sort((a, b) => {
  const ai = TOP_COUNTRIES.indexOf(a)
  const bi = TOP_COUNTRIES.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
})

// ── Currency map ─────────────────────────────────────────────────────────────

const CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  'United States': { code: 'USD', symbol: '$' },
  'United Kingdom': { code: 'GBP', symbol: '£' },
  'Canada': { code: 'CAD', symbol: 'C$' },
  'Australia': { code: 'AUD', symbol: 'A$' },
  'New Zealand': { code: 'NZD', symbol: 'NZ$' },
  'India': { code: 'INR', symbol: '₹' },
  'Japan': { code: 'JPY', symbol: '¥' },
  'China': { code: 'CNY', symbol: '¥' },
  'Brazil': { code: 'BRL', symbol: 'R$' },
  'South Africa': { code: 'ZAR', symbol: 'R' },
  'Switzerland': { code: 'CHF', symbol: 'CHF' },
  'Norway': { code: 'NOK', symbol: 'kr' },
  'Sweden': { code: 'SEK', symbol: 'kr' },
  'Denmark': { code: 'DKK', symbol: 'kr' },
  'Russia': { code: 'RUB', symbol: '₽' },
  'South Korea': { code: 'KRW', symbol: '₩' },
  'Mexico': { code: 'MXN', symbol: 'MX$' },
  'Singapore': { code: 'SGD', symbol: 'S$' },
  'Hong Kong': { code: 'HKD', symbol: 'HK$' },
}

const EUR_COUNTRIES = [
  'Germany','France','Netherlands','Ireland','Italy','Spain','Portugal',
  'Austria','Belgium','Finland','Greece','Luxembourg','Malta','Cyprus',
  'Estonia','Latvia','Lithuania','Slovakia','Slovenia','Croatia',
]

function getCurrency(country: string) {
  if (EUR_COUNTRIES.includes(country)) return { code: 'EUR', symbol: '€' }
  return CURRENCY_MAP[country] ?? { code: 'USD', symbol: '$' }
}

// ── Registration label ────────────────────────────────────────────────────────

function getRegistrationLabel(country: string) {
  const labels: Record<string, string> = {
    'United Kingdom': 'Charity Commission Number',
    'United States': 'EIN Number',
    'Canada': 'CRA Registration Number',
    'Australia': 'ABN Number',
  }
  return labels[country] ?? 'Registration Number (optional)'
}

// ── Browser locale → country ──────────────────────────────────────────────────

function detectCountry(): string {
  try {
    const lang = navigator.language || 'en'
    const regionCode = new Intl.Locale(lang).region ?? ''
    const regionMap: Record<string, string> = {
      US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
      IN: 'India', DE: 'Germany', FR: 'France', NL: 'Netherlands',
      IE: 'Ireland', NZ: 'New Zealand', ZA: 'South Africa', NG: 'Nigeria',
      KE: 'Kenya', GH: 'Ghana', BR: 'Brazil', MX: 'Mexico', JP: 'Japan',
      SG: 'Singapore', PH: 'Philippines', PK: 'Pakistan', BD: 'Bangladesh',
    }
    return regionMap[regionCode] ?? 'United States'
  } catch {
    return 'United States'
  }
}

// ── Static data ───────────────────────────────────────────────────────────────

const NONPROFIT_TYPES = [
  'Registered Charity (UK)',
  '501(c)(3) Nonprofit (USA)',
  'Registered Nonprofit (Canada)',
  'Incorporated Association (Australia)',
  'NGO (International)',
  'Community Group (Unregistered)',
  'Other',
]

const sectors: { value: Sector; label: string }[] = [
  { value: 'animals', label: 'Animals & Wildlife' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'children', label: 'Children & Young People' },
  { value: 'disability', label: 'Disability' },
  { value: 'education', label: 'Education & Training' },
  { value: 'elderly', label: 'Elderly & Older People' },
  { value: 'environment', label: 'Environment & Conservation' },
  { value: 'health', label: 'Health & Wellbeing' },
  { value: 'homelessness', label: 'Homelessness & Housing' },
  { value: 'other', label: 'Other / General Community' },
]

const incomeOptions: { value: AnnualIncome; label: string }[] = [
  { value: 'under_100k', label: 'Under 100,000 (small)' },
  { value: '100k_500k', label: '100,000 – 500,000 (medium)' },
  { value: 'over_500k', label: 'Over 500,000 (large)' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [error, setError] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)

  const [form, setForm] = useState({
    name: '',
    sector: '' as Sector,
    location: '',
    country: '',
    currency: 'USD',
    annual_income: '' as AnnualIncome,
    nonprofit_type: '',
    registration_number: '',
    beneficiaries: '',
    current_projects: '',
  })

  // Detect country on mount
  useEffect(() => {
    const detected = detectCountry()
    const currency = getCurrency(detected)
    setForm(f => ({ ...f, country: detected, currency: currency.code }))
    setCountrySearch(detected)
  }, [])

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function selectCountry(country: string) {
    const currency = getCurrency(country)
    setForm(f => ({ ...f, country, currency: currency.code }))
    setCountrySearch(country)
    setCountryOpen(false)
  }

  const filteredCountries = useMemo(() =>
    COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())),
    [countrySearch]
  )

  const currency = useMemo(() => getCurrency(form.country), [form.country])

  const incomeWithCurrency = incomeOptions.map(o => ({
    ...o,
    label: o.label.replace(/(\d[\d,]+)/g, `${currency.symbol}$1`),
  }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStep(3)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: form.name,
        sector: form.sector,
        location: form.location,
        country: form.country,
        currency: form.currency,
        annual_income: form.annual_income,
        nonprofit_type: form.nonprofit_type,
        charity_number: form.registration_number || null,
        beneficiaries: form.beneficiaries,
        current_projects: form.current_projects,
        registered_charity: ['Registered Charity (UK)', '501(c)(3) Nonprofit (USA)', 'Registered Nonprofit (Canada)', 'Incorporated Association (Australia)'].includes(form.nonprofit_type),
        user_id: user.id,
      })
      .select()
      .single()

    if (orgError) {
      setError('Failed to save your organisation. Please try again.')
      setStep(2)
      setLoading(false)
      return
    }

    const res = await fetch('/api/grants/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId: org.id }),
    })
    const data = await res.json()
    setMatchCount(data.count ?? 0)
    await fetch('/api/email/welcome', { method: 'POST' })

    setLoading(false)
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F4C35] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#00C875" strokeWidth="2"/>
                <circle cx="9" cy="9" r="3" fill="#00C875"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-[#0F4C35]">GrantRadar</span>
          </div>
        </div>

        {/* Progress bar */}
        {step <= 2 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-[#0F4C35]' : 'bg-gray-200'}`} />
            ))}
          </div>
        )}

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F2ED] flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke="#0F4C35" strokeWidth="2"/>
                <circle cx="16" cy="16" r="6" fill="#00C875"/>
                <line x1="16" y1="3" x2="16" y2="7" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="25" y1="16" x2="29" y2="16" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="16" x2="7" y2="16" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="25" x2="16" y2="29" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Welcome to GrantRadar</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
              Tell us about your nonprofit or charity so our AI can find the grants you&apos;re genuinely eligible for — in your country, in your currency.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              {[
                { value: '3 min', label: 'Setup time' },
                { value: '2,400+', label: 'Grants scanned' },
                { value: '50+', label: 'Countries' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#F4F6F5] rounded-xl p-3">
                  <div className="font-bold text-[#0F4C35] text-lg">{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full justify-center py-3.5">
              Let&apos;s get started
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-1">Tell us about your nonprofit</h2>
            <p className="text-gray-500 text-sm mb-6">This helps us find grants you&apos;re actually eligible for.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Organisation name */}
              <div>
                <label className="label">Organisation name</label>
                <input
                  required
                  className="input"
                  placeholder="Chicago Education Alliance"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>

              {/* Country — searchable combobox */}
              <div className="relative">
                <label className="label">Country <span className="text-[#0F4C35] text-xs">(auto-detected)</span></label>
                <input
                  required
                  className="input"
                  placeholder="Search your country..."
                  value={countrySearch}
                  onFocus={() => setCountryOpen(true)}
                  onChange={(e) => {
                    setCountrySearch(e.target.value)
                    setCountryOpen(true)
                  }}
                />
                {countryOpen && filteredCountries.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-52 overflow-y-auto">
                    {filteredCountries.slice(0, 30).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#E8F2ED] transition-colors ${TOP_COUNTRIES.includes(c) ? 'font-medium' : ''} ${c === form.country ? 'bg-[#E8F2ED] text-[#0F4C35]' : 'text-gray-700'}`}
                        onClick={() => selectCountry(c)}
                      >
                        {TOP_COUNTRIES.includes(c) && <span className="text-[#0F4C35] mr-1.5">★</span>}
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {/* Currency badge */}
                {form.country && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Currency auto-set to</span>
                    <span className="text-xs font-semibold text-[#0F4C35] bg-[#E8F2ED] px-2 py-0.5 rounded-full">
                      {currency.code} ({currency.symbol})
                    </span>
                  </div>
                )}
              </div>

              {/* Nonprofit type */}
              <div>
                <label className="label">Organisation type</label>
                <select
                  required
                  className="input"
                  value={form.nonprofit_type}
                  onChange={(e) => update('nonprofit_type', e.target.value)}
                >
                  <option value="">Select your type...</option>
                  {NONPROFIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Registration number — dynamic label */}
              <div>
                <label className="label">{getRegistrationLabel(form.country)}</label>
                <input
                  className="input"
                  placeholder="Optional"
                  value={form.registration_number}
                  onChange={(e) => update('registration_number', e.target.value)}
                />
              </div>

              {/* Primary sector */}
              <div>
                <label className="label">Primary sector</label>
                <select
                  required
                  className="input"
                  value={form.sector}
                  onChange={(e) => update('sector', e.target.value)}
                >
                  <option value="">Select your sector...</option>
                  {sectors.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="label">City / Region</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Chicago, Illinois"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                />
              </div>

              {/* Annual income */}
              <div>
                <label className="label">Annual income <span className="text-gray-400 font-normal">({currency.code})</span></label>
                <select
                  required
                  className="input"
                  value={form.annual_income}
                  onChange={(e) => update('annual_income', e.target.value)}
                >
                  <option value="">Select income range...</option>
                  {incomeWithCurrency.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Beneficiaries */}
              <div>
                <label className="label">Who do you help? (beneficiaries)</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Young people aged 11–25 experiencing mental health challenges and social isolation in underserved communities."
                  value={form.beneficiaries}
                  onChange={(e) => update('beneficiaries', e.target.value)}
                />
              </div>

              {/* Current projects */}
              <div>
                <label className="label">What are you currently working on?</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="e.g. Running weekly counselling sessions, a community garden project, and an after-school mentoring programme."
                  value={form.current_projects}
                  onChange={(e) => update('current_projects', e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !form.country}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
              >
                Find my grants
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Step 3 — Loading */}
        {step === 3 && (
          <div className="card text-center py-12">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[#E8F2ED]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#0F4C35] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#00C875" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" fill="#00C875"/>
                </svg>
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Finding your grants...</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Our AI is scanning 2,400+ grants worldwide and scoring your eligibility for each one. This takes about 10–15 seconds.
            </p>
            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              {['Analysing your organisation profile...', 'Scanning grant databases worldwide...', 'Scoring eligibility...'].map((msg, i) => (
                <div key={msg} className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C875] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div className="card text-center py-10">
            <div className="w-16 h-16 rounded-full bg-[#E8F2ED] flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" fill="#0F4C35"/>
                <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-3">
              We found {matchCount} grant{matchCount !== 1 ? 's' : ''} for you!
            </h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              Each one has been scored for eligibility with a specific reason why it matches your organisation. Let&apos;s go explore them.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary px-8 py-3.5 justify-center"
            >
              View my grants
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
