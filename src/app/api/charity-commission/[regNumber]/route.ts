import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CCFinancialYear {
  year: string
  endYear: number
  periodEndDate: string
  periodStartDate: string | null
  incomeTotal: number
  incomeDonations: number
  incomeCharitable: number
  incomeTrading: number
  incomeInvestments: number
  incomeOther: number
  expenditureTotal: number
  netIncome: number
  totalFunds: number | null
  accountType: string | null
  isSurplus: boolean
}

export interface CCCharityProfile {
  // Core
  registrationNumber: string
  charityName: string
  charityType: string | null
  registrationStatus: string
  dateOfRegistration: string | null
  dateOfRemoval: string | null
  yearsOperating: number | null
  reportingStatus: string | null
  contactWeb: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactAddress: string
  contactPostcode: string | null
  charityActivities: string | null
  charitableObjects: string | null
  charityGiftAid: boolean | null
  charityHasLand: boolean | null

  // Financial
  financialYears: CCFinancialYear[]
  latestIncome: number
  latestExpenditure: number
  latestNetIncome: number
  latestTotalFunds: number | null
  latestYear: string | null
  fiveYearGrowth: number | null
  tenYearGrowth: number | null
  deficitYears: number
  totalYears: number
  monthsOfReserves: number | null
  incomeTrend: 'growing' | 'stable' | 'declining' | 'insufficient_data'

  // Health
  healthBadge: 'FINANCIALLY HEALTHY' | 'FINANCIALLY STABLE' | 'FINANCIAL CONCERNS' | 'FINANCIAL RISK'
  healthColor: 'green' | 'amber' | 'red'
  healthNote: string

  // Compliance
  complianceScore: number | null
  annualReturns: {
    cycleRef: string | null
    periodEnd: string | null
    required: boolean | null
    received: boolean | null
    dateReceived: string | null
    dateRequired: string | null
    accountsType: string | null
    filedOnTime: boolean | null
  }[]

  // Governance
  geographicAreas: string[]
  classifications: { code: string; type: string; desc: string | null }[]
  trustees: { name: string; isChair: boolean; trusteeId: string | null }[]
  trusteeCount: number
  otherNames: { nameType: string; name: string }[]
  events: { eventType: string; dateOfEvent: string | null; reason: string | null }[]
  linkedCharities: { number: string; name: string | null }[]

  // AI
  aiSummary: string | null

  // Meta
  lastSynced: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatYear(dateStr: string): string {
  const d = new Date(dateStr)
  const endYr = d.getFullYear()
  const endMo = d.getMonth() + 1
  const startYr = endMo <= 6 ? endYr - 1 : endYr
  return `${startYr}-${String(endYr).slice(2)}`
}

function calcHealthBadge(
  deficitYears: number,
  totalYears: number,
  fiveYearGrowth: number | null,
  monthsReserves: number | null
): { badge: CCCharityProfile['healthBadge']; color: CCCharityProfile['healthColor']; note: string } {
  const defRatio = totalYears > 0 ? deficitYears / totalYears : 0
  const growth   = fiveYearGrowth ?? 0

  if (defRatio <= 0.15 && growth >= 0 && (monthsReserves === null || monthsReserves >= 3)) {
    return { badge: 'FINANCIALLY HEALTHY', color: 'green', note: 'Consistent income growth, adequate reserves, no recent deficits.' }
  }
  if (defRatio <= 0.3 && growth >= -15) {
    return { badge: 'FINANCIALLY STABLE', color: 'amber', note: 'Broadly stable with minor fluctuations. Some deficit years noted.' }
  }
  if (defRatio <= 0.5) {
    return { badge: 'FINANCIAL CONCERNS', color: 'amber', note: 'Multiple deficit years — review reserves and income diversification.' }
  }
  return { badge: 'FINANCIAL RISK', color: 'red', note: 'Majority of years in deficit. High financial risk — due diligence advised.' }
}

async function generateAiSummary(
  name: string,
  years: CCFinancialYear[],
  deficitYears: number,
  fiveYearGrowth: number | null
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || years.length === 0) return null

  const tableText = years
    .slice(-10)
    .map(y => `${y.year}: Income £${(y.incomeTotal / 1000).toFixed(0)}k, Net ${y.isSurplus ? '+' : ''}£${(y.netIncome / 1000).toFixed(0)}k`)
    .join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 250,
        system: 'You are a UK charity finance expert. Return a single plain-text paragraph only — no JSON, no markdown.',
        messages: [{
          role: 'user',
          content: `Summarise this charity's financial health in 2-3 sentences. Mention key trends, any notable deficits, and close with "Risk: LOW/MEDIUM/HIGH."\n\nCharity: ${name}\n${tableText}`,
        }],
      }),
    })
    const data = await res.json() as { content?: Array<{ text: string }> }
    return data.content?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ regNumber: string }> }
) {
  const { regNumber } = await params
  const num = regNumber.replace(/\D/g, '')

  if (!num) return NextResponse.json({ error: 'Invalid registration number' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Core charity ────────────────────────────────────────────────────────────
  const { data: core, error: coreErr } = await supabase
    .from('cc_charity_core')
    .select('*')
    .eq('registration_number', num)
    .single()

  if (coreErr || !core) {
    return NextResponse.json({ error: 'charity_not_found' }, { status: 404 })
  }

  // ── Parallel queries ────────────────────────────────────────────────────────
  const [
    { data: rawFinancials },
    { data: rawGeo },
    { data: rawClass },
    { data: rawTrustees },
    { data: rawNames },
    { data: rawEvents },
    { data: rawLinked },
    { data: rawReturns },
  ] = await Promise.all([
    supabase.from('cc_financial_history').select('*').eq('registration_number', num).order('period_end_date', { ascending: true }),
    supabase.from('cc_geographic_area').select('*').eq('registration_number', num),
    supabase.from('cc_classification').select('*').eq('registration_number', num),
    supabase.from('cc_trustee').select('*').eq('registration_number', num),
    supabase.from('cc_other_name').select('*').eq('registration_number', num),
    supabase.from('cc_event').select('*').eq('registration_number', num).order('date_of_event', { ascending: false }),
    supabase.from('cc_linked_charity').select('*').eq('registration_number', num),
    supabase.from('cc_annual_return').select('*').eq('registration_number', num).order('period_end', { ascending: false }),
  ])

  // ── Build financial years ────────────────────────────────────────────────────
  const financialYears: CCFinancialYear[] = (rawFinancials ?? []).map(r => {
    const incomeTotal = Number(r.income_total ?? 0)
    const expTotal    = Number(r.expenditure_total ?? 0)
    const net         = Number(r.net_income ?? (incomeTotal - expTotal))
    return {
      year:             formatYear(r.period_end_date),
      endYear:          new Date(r.period_end_date).getFullYear(),
      periodEndDate:    r.period_end_date,
      periodStartDate:  r.period_start_date,
      incomeTotal,
      incomeDonations:  Number(r.income_donations_legacies ?? 0),
      incomeCharitable: Number(r.income_charitable_activities ?? 0),
      incomeTrading:    Number(r.income_other_trading ?? 0),
      incomeInvestments:Number(r.income_investments ?? 0),
      incomeOther:      Number(r.income_other ?? 0),
      expenditureTotal: expTotal,
      netIncome:        net,
      totalFunds:       r.total_funds_end_period ? Number(r.total_funds_end_period) : null,
      accountType:      r.account_type,
      isSurplus:        net >= 0,
    }
  }).filter(y => y.incomeTotal > 0)

  // ── Derived financial metrics ─────────────────────────────────────────────────
  const sorted5  = financialYears.slice(-5)
  const sorted10 = financialYears.slice(-10)
  const latest   = financialYears[financialYears.length - 1]
  const fiveAgo  = financialYears.length >= 5 ? financialYears[financialYears.length - 5] : null
  const tenAgo   = financialYears.length >= 10 ? financialYears[financialYears.length - 10] : null

  const latestIncome      = latest?.incomeTotal ?? 0
  const latestExpenditure = latest?.expenditureTotal ?? 0
  const latestNetIncome   = latest?.netIncome ?? 0
  const latestTotalFunds  = latest?.totalFunds ?? null
  const latestYear        = latest?.year ?? null

  const fiveYearGrowth = fiveAgo && fiveAgo.incomeTotal > 0
    ? Math.round(((latestIncome - fiveAgo.incomeTotal) / fiveAgo.incomeTotal) * 100)
    : null

  const tenYearGrowth = tenAgo && tenAgo.incomeTotal > 0
    ? Math.round(((latestIncome - tenAgo.incomeTotal) / tenAgo.incomeTotal) * 100)
    : null

  const deficitYears = financialYears.filter(y => y.netIncome < 0).length
  const totalYears   = financialYears.length

  // Months of reserves = total funds / monthly expenditure
  const monthsOfReserves = (latestTotalFunds && latestExpenditure > 0)
    ? Math.round((latestTotalFunds / (latestExpenditure / 12)) * 10) / 10
    : null

  // Income trend
  let incomeTrend: CCCharityProfile['incomeTrend'] = 'insufficient_data'
  if (sorted5.length >= 3) {
    const recent2avg = (sorted5[sorted5.length - 1].incomeTotal + sorted5[sorted5.length - 2].incomeTotal) / 2
    const older2avg  = (sorted5[0].incomeTotal + sorted5[1].incomeTotal) / 2
    const changePct  = older2avg > 0 ? ((recent2avg - older2avg) / older2avg) * 100 : 0
    incomeTrend = changePct >= 10 ? 'growing' : changePct <= -10 ? 'declining' : 'stable'
  }

  // Years operating
  const yearsOperating = core.date_of_registration
    ? Math.floor((Date.now() - new Date(core.date_of_registration).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  // Health badge
  const { badge: healthBadge, color: healthColor, note: healthNote } =
    calcHealthBadge(deficitYears, totalYears, fiveYearGrowth, monthsOfReserves)

  // ── Compliance score ──────────────────────────────────────────────────────
  const returns = (rawReturns ?? []).map(r => ({
    cycleRef:     r.ar_cycle_reference,
    periodEnd:    r.period_end,
    required:     r.accounts_required,
    received:     r.accounts_received,
    dateReceived: r.date_return_received,
    dateRequired: r.date_return_required,
    accountsType: r.accounts_type,
    filedOnTime:  r.date_return_received && r.date_return_required
      ? new Date(r.date_return_received) <= new Date(r.date_return_required)
      : null,
  }))

  const returnsFiled   = returns.filter(r => r.received).length
  const returnsTotal   = returns.filter(r => r.required).length
  const complianceScore = returnsTotal > 0 ? Math.round((returnsFiled / returnsTotal) * 100) : null

  // ── Contact address ───────────────────────────────────────────────────────
  const addressParts = [
    core.contact_address1, core.contact_address2, core.contact_address3,
    core.contact_address4, core.contact_address5,
  ].filter(Boolean)
  const contactAddress = addressParts.join(', ')

  // ── AI summary ────────────────────────────────────────────────────────────
  const aiSummary = await generateAiSummary(core.charity_name, financialYears, deficitYears, fiveYearGrowth)

  // ── Assemble result ───────────────────────────────────────────────────────
  const profile: CCCharityProfile = {
    registrationNumber: core.registration_number,
    charityName:        core.charity_name,
    charityType:        core.charity_type,
    registrationStatus: core.registration_status,
    dateOfRegistration: core.date_of_registration,
    dateOfRemoval:      core.date_of_removal,
    yearsOperating,
    reportingStatus:    core.reporting_status,
    contactWeb:         core.contact_web,
    contactEmail:       core.contact_email,
    contactPhone:       core.contact_phone,
    contactAddress,
    contactPostcode:    core.contact_postcode,
    charityActivities:  core.charity_activities,
    charitableObjects:  core.charitable_objects,
    charityGiftAid:     core.charity_gift_aid,
    charityHasLand:     core.charity_has_land,
    financialYears:     financialYears.slice(-10),
    latestIncome,
    latestExpenditure,
    latestNetIncome,
    latestTotalFunds,
    latestYear,
    fiveYearGrowth,
    tenYearGrowth,
    deficitYears,
    totalYears,
    monthsOfReserves,
    incomeTrend,
    healthBadge,
    healthColor,
    healthNote,
    complianceScore,
    annualReturns: returns,
    geographicAreas: (rawGeo ?? []).map(g => g.geographic_area),
    classifications: (rawClass ?? []).map(c => ({ code: c.classification_code, type: c.classification_type, desc: c.classification_desc })),
    trustees: (rawTrustees ?? []).map(t => ({ name: t.trustee_name, isChair: t.is_chair, trusteeId: t.trustee_id })),
    trusteeCount: (rawTrustees ?? []).length,
    otherNames: (rawNames ?? []).map(n => ({ nameType: n.name_type, name: n.name })),
    events: (rawEvents ?? []).map(e => ({ eventType: e.event_type, dateOfEvent: e.date_of_event, reason: e.reason_for_event })),
    linkedCharities: (rawLinked ?? []).map(l => ({ number: l.linked_charity_number, name: l.linked_charity_name })),
    aiSummary,
    lastSynced: core.updated_at,
  }

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
