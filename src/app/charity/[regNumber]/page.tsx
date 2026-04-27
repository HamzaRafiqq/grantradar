import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import FinancialHistory from '@/components/charity/FinancialHistory'
import type { CCCharityProfile } from '@/app/api/charity-commission/[regNumber]/route'

// Re-use the same logic as the API route to avoid an extra HTTP call in SSR
async function getProfile(regNumber: string): Promise<CCCharityProfile | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: core } = await supabase
    .from('cc_charity_core')
    .select('*')
    .eq('registration_number', regNumber)
    .single()

  if (!core) return null

  const [
    { data: rawFinancials },
    { data: rawGeo },
    { data: rawClass },
    { data: rawTrustees },
    { data: rawNames },
    { data: rawLinked },
  ] = await Promise.all([
    supabase.from('cc_financial_history').select('*').eq('registration_number', regNumber).order('period_end_date', { ascending: true }),
    supabase.from('cc_geographic_area').select('geographic_area').eq('registration_number', regNumber),
    supabase.from('cc_classification').select('classification_code, classification_type, classification_desc').eq('registration_number', regNumber),
    supabase.from('cc_trustee').select('trustee_name, is_chair, trustee_id').eq('registration_number', regNumber),
    supabase.from('cc_other_name').select('name_type, name').eq('registration_number', regNumber),
    supabase.from('cc_linked_charity').select('linked_charity_number, linked_charity_name').eq('registration_number', regNumber),
  ])

  function formatYear(dateStr: string): string {
    const d = new Date(dateStr)
    const endYr = d.getFullYear()
    const endMo = d.getMonth() + 1
    const startYr = endMo <= 6 ? endYr - 1 : endYr
    return `${startYr}-${String(endYr).slice(2)}`
  }

  const financialYears = (rawFinancials ?? []).map(r => {
    const incomeTotal = Number(r.income_total ?? 0)
    const expTotal    = Number(r.expenditure_total ?? 0)
    const net         = Number(r.net_income ?? (incomeTotal - expTotal))
    return {
      year: formatYear(r.period_end_date),
      endYear: new Date(r.period_end_date).getFullYear(),
      periodEndDate: r.period_end_date,
      periodStartDate: r.period_start_date,
      incomeTotal,
      incomeDonations:   Number(r.income_donations_legacies ?? 0),
      incomeCharitable:  Number(r.income_charitable_activities ?? 0),
      incomeTrading:     Number(r.income_other_trading ?? 0),
      incomeInvestments: Number(r.income_investments ?? 0),
      incomeOther:       Number(r.income_other ?? 0),
      expenditureTotal:  expTotal,
      netIncome:         net,
      totalFunds:        r.total_funds_end_period ? Number(r.total_funds_end_period) : null,
      accountType:       r.account_type,
      isSurplus:         net >= 0,
    }
  }).filter(y => y.incomeTotal > 0)

  const latest   = financialYears[financialYears.length - 1]
  const fiveAgo  = financialYears.length >= 5 ? financialYears[financialYears.length - 5] : null

  const latestIncome      = latest?.incomeTotal ?? 0
  const latestExpenditure = latest?.expenditureTotal ?? 0
  const latestTotalFunds  = latest?.totalFunds ?? null

  const fiveYearGrowth = fiveAgo && fiveAgo.incomeTotal > 0
    ? Math.round(((latestIncome - fiveAgo.incomeTotal) / fiveAgo.incomeTotal) * 100)
    : null

  const deficitYears = financialYears.filter(y => y.netIncome < 0).length
  const totalYears   = financialYears.length
  const monthsOfReserves = latestTotalFunds && latestExpenditure > 0
    ? Math.round((latestTotalFunds / (latestExpenditure / 12)) * 10) / 10
    : null

  const yearsOperating = core.date_of_registration
    ? Math.floor((Date.now() - new Date(core.date_of_registration).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const defRatio = totalYears > 0 ? deficitYears / totalYears : 0
  const growth   = fiveYearGrowth ?? 0
  const healthBadge = defRatio <= 0.15 && growth >= 0 ? 'FINANCIALLY HEALTHY'
    : defRatio <= 0.3 ? 'FINANCIALLY STABLE'
    : defRatio <= 0.5 ? 'FINANCIAL CONCERNS'
    : 'FINANCIAL RISK'
  const healthColor = healthBadge === 'FINANCIALLY HEALTHY' ? 'green'
    : healthBadge === 'FINANCIAL RISK' ? 'red'
    : 'amber'
  const healthNote = healthBadge === 'FINANCIALLY HEALTHY'
    ? 'Consistent income growth, adequate reserves, no recent deficits.'
    : healthBadge === 'FINANCIALLY STABLE'
    ? 'Broadly stable with minor fluctuations.'
    : healthBadge === 'FINANCIAL CONCERNS'
    ? 'Multiple deficit years — review sustainability.'
    : 'Majority of years in deficit. High financial risk.'

  const incomeTrend: CCCharityProfile['incomeTrend'] = financialYears.length < 3 ? 'insufficient_data'
    : (() => {
        const last = financialYears.slice(-2)
        const prev = financialYears.slice(-5, -2)
        const recentAvg = last.reduce((s, y) => s + y.incomeTotal, 0) / last.length
        const prevAvg   = prev.length > 0 ? prev.reduce((s, y) => s + y.incomeTotal, 0) / prev.length : recentAvg
        const pct = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0
        return pct >= 10 ? 'growing' : pct <= -10 ? 'declining' : 'stable'
      })()

  return {
    registrationNumber: core.registration_number,
    charityName: core.charity_name,
    charityType: core.charity_type,
    registrationStatus: core.registration_status,
    dateOfRegistration: core.date_of_registration,
    dateOfRemoval: core.date_of_removal,
    yearsOperating,
    reportingStatus: core.reporting_status,
    contactWeb: core.contact_web,
    contactEmail: core.contact_email,
    contactPhone: core.contact_phone,
    contactAddress: [core.contact_address1, core.contact_address2, core.contact_address3].filter(Boolean).join(', '),
    contactPostcode: core.contact_postcode,
    charityActivities: core.charity_activities,
    charitableObjects: core.charitable_objects,
    charityGiftAid: core.charity_gift_aid,
    charityHasLand: core.charity_has_land,
    financialYears: financialYears.slice(-10),
    latestIncome,
    latestExpenditure,
    latestNetIncome: latest?.netIncome ?? 0,
    latestTotalFunds,
    latestYear: latest?.year ?? null,
    fiveYearGrowth,
    tenYearGrowth: null,
    deficitYears,
    totalYears,
    monthsOfReserves,
    incomeTrend,
    healthBadge: healthBadge as CCCharityProfile['healthBadge'],
    healthColor: healthColor as CCCharityProfile['healthColor'],
    healthNote,
    complianceScore: null,
    annualReturns: [],
    geographicAreas: (rawGeo ?? []).map((g: { geographic_area: string }) => g.geographic_area),
    classifications: (rawClass ?? []).map((c: { classification_code: string; classification_type: string; classification_desc: string }) => ({
      code: c.classification_code,
      type: c.classification_type,
      desc: c.classification_desc,
    })),
    trustees: (rawTrustees ?? []).map((t: { trustee_name: string; is_chair: boolean; trustee_id: string }) => ({
      name: t.trustee_name,
      isChair: t.is_chair,
      trusteeId: t.trustee_id,
    })),
    trusteeCount: (rawTrustees ?? []).length,
    otherNames: (rawNames ?? []).map((n: { name_type: string; name: string }) => ({ nameType: n.name_type, name: n.name })),
    events: [],
    linkedCharities: (rawLinked ?? []).map((l: { linked_charity_number: string; linked_charity_name: string }) => ({
      number: l.linked_charity_number,
      name: l.linked_charity_name,
    })),
    aiSummary: null,
    lastSynced: core.updated_at,
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ regNumber: string }> }
): Promise<Metadata> {
  const { regNumber } = await params
  const profile = await getProfile(regNumber)
  if (!profile) return { title: 'Charity Not Found — FundsRadar' }
  return {
    title: `${profile.charityName} — Charity Intelligence | FundsRadar`,
    description: `Financial history, trustee information, and compliance record for ${profile.charityName} (Reg. ${profile.registrationNumber}).`,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}m`
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}k`
  return `£${n.toLocaleString()}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicCharityPage(
  { params }: { params: Promise<{ regNumber: string }> }
) {
  const { regNumber } = await params
  const num = regNumber.replace(/\D/g, '')
  if (!num) notFound()

  const profile = await getProfile(num)
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="font-display text-2xl font-bold text-[#0D1117] mb-2">Charity Not Found</h1>
          <p className="text-gray-500 mb-6">
            Registration number <strong>{num}</strong> is not in our database yet.
            This may be because our weekly import hasn&apos;t run, or the charity isn&apos;t on the CC register.
          </p>
          <Link href="/" className="bg-[#0F4C35] text-white px-6 py-3 rounded-xl font-semibold text-sm inline-block hover:bg-[#0c3d2a] transition-colors">
            Back to FundsRadar
          </Link>
        </div>
      </div>
    )
  }

  const isActive  = profile.registrationStatus === 'Registered'
  const regDate   = profile.dateOfRegistration ? new Date(profile.dateOfRegistration) : null
  const regFmt    = regDate ? regDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  const healthStyles: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50 text-red-700 border-red-200',
  }
  const healthDots: Record<string, string> = {
    green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-[#0F4C35] text-lg">
            FundsRadar
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">Sign in</Link>
            <Link href="/signup" className="bg-[#0F4C35] text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-[#0c3d2a] transition-colors">
              For charities
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0D1117]">{profile.charityName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-400">Reg. {profile.registrationNumber}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                  isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {isActive ? '✅ Registered' : '❌ ' + profile.registrationStatus}
                </span>
              </div>
            </div>
            {/* Health badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border self-start flex-shrink-0 ${healthStyles[profile.healthColor]}`}>
              <span className={`w-2 h-2 rounded-full ${healthDots[profile.healthColor]}`} />
              {profile.healthBadge}
            </span>
          </div>

          {/* Registration info */}
          {regDate && (
            <p className="text-sm text-gray-500 mb-4">
              Registered {regFmt}
              {profile.yearsOperating !== null && ` (${profile.yearsOperating} years ago)`}
            </p>
          )}

          {/* Key stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#E8F2ED] rounded-xl p-3">
              <div className="font-bold text-[#0F4C35]">
                {profile.latestIncome > 0 ? fmt(profile.latestIncome) : '—'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Latest income</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className={`font-bold ${profile.fiveYearGrowth !== null && profile.fiveYearGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {profile.fiveYearGrowth !== null ? `${profile.fiveYearGrowth >= 0 ? '+' : ''}${profile.fiveYearGrowth}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">5-year growth</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="font-bold text-[#0D1117]">
                {profile.monthsOfReserves !== null ? `${profile.monthsOfReserves}mo` : '—'}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Est. reserves</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className={`font-bold ${profile.deficitYears === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {profile.deficitYears} of {profile.totalYears}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Deficit years</div>
            </div>
          </div>

          {/* Contact / web */}
          <div className="flex flex-wrap gap-3 text-sm">
            {profile.contactWeb && (
              <a href={profile.contactWeb.startsWith('http') ? profile.contactWeb : `https://${profile.contactWeb}`}
                target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate max-w-[200px]">
                🌐 {profile.contactWeb}
              </a>
            )}
            {profile.contactEmail && (
              <a href={`mailto:${profile.contactEmail}`} className="text-blue-600 hover:underline">
                ✉️ {profile.contactEmail}
              </a>
            )}
            {profile.contactPostcode && (
              <span className="text-gray-500">📍 {profile.contactPostcode}</span>
            )}
          </div>
        </div>

        {/* Activities / objects */}
        {(profile.charityActivities || profile.charitableObjects) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-3">What this charity does</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {profile.charityActivities || profile.charitableObjects}
            </p>
          </div>
        )}

        {/* Geographic areas */}
        {profile.geographicAreas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-3">Areas of operation</h2>
            <div className="flex flex-wrap gap-2">
              {profile.geographicAreas.map(area => (
                <span key={area} className="text-sm bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cause classifications */}
        {profile.classifications.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-3">Cause areas</h2>
            <div className="space-y-2">
              {['What', 'Who', 'How'].map(type => {
                const items = profile.classifications.filter(c => c.type === type)
                if (items.length === 0) return null
                return (
                  <div key={type}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{type}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {items.map(c => (
                        <span key={c.code} className="text-xs bg-gray-50 text-gray-700 border border-gray-100 px-2.5 py-0.5 rounded-full">
                          {c.desc ?? c.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Full financial history */}
        {profile.financialYears.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-5">Financial history</h2>
            <FinancialHistory
              registrationNumber={num}
              initialData={profile}
            />
          </div>
        )}

        {/* Previous names */}
        {profile.otherNames.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-3">Previous names</h2>
            <div className="flex flex-wrap gap-2">
              {profile.otherNames.map(n => (
                <span key={n.name} className="text-sm bg-gray-50 text-gray-600 border border-gray-100 px-3 py-1 rounded-lg">
                  {n.name} <span className="text-gray-400 text-xs">({n.nameType})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Claim / link to FundsRadar */}
        <div className="bg-[#0F4C35] rounded-2xl p-6 text-center text-white">
          <h2 className="font-display text-xl font-bold mb-2">Is this your charity?</h2>
          <p className="text-white/70 text-sm mb-5">
            Claim your profile on FundsRadar and get matched to hundreds of relevant grants.
            Free to join — set up in minutes.
          </p>
          <Link
            href={`/signup?reg=${num}`}
            className="inline-block bg-[#00C875] text-[#0D1117] font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#00b368] transition-colors"
          >
            Claim this profile →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-400 text-center pb-4">
          Data sourced from the Charity Commission for England &amp; Wales open register.
          Updated weekly. Registration number {num}.
        </p>
      </div>
    </div>
  )
}
