import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'

export interface YearlyFinancial {
  year: string        // e.g. "2024-25"
  endYear: number     // e.g. 2025
  income: number
  expenditure: number
  surplus: number
}

export interface FinancialIntelligence {
  charityName: string
  regNumber: string
  latestIncome: number
  fiveYearGrowth: number       // percent
  tenYearGrowth: number        // percent
  deficitYears: number
  totalYears: number
  reservesMonths: number | null // null if not available
  healthStatus: 'FINANCIALLY HEALTHY' | 'FINANCIALLY STABLE' | 'FINANCIAL CONCERN' | 'FINANCIAL RISK'
  healthColor: 'green' | 'amber' | 'red'
  years: YearlyFinancial[]
  aiSummary: string
  grantContext: string          // populated when grantAmount provided
}

function parseEndDate(raw: string | number | null | undefined): Date | null {
  if (raw === null || raw === undefined || raw === '') return null

  // Numeric year passed directly (e.g. from a field like { year: 2024 })
  if (typeof raw === 'number') {
    if (raw >= 1990 && raw <= 2035) return new Date(raw, 11, 31)
    // Unix timestamp (seconds or ms)
    const d = new Date(raw > 1e10 ? raw : raw * 1000)
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1990) return d
    return null
  }

  const s = String(raw).trim()

  // ASP.NET JSON date: "/Date(1711843200000)/" or "/Date(1711843200000+0000)/"
  const aspMatch = s.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//)
  if (aspMatch) {
    const d = new Date(parseInt(aspMatch[1]))
    if (!isNaN(d.getTime())) return d
  }

  // Plain 4-digit year: "2024"
  if (/^\d{4}$/.test(s)) {
    return new Date(parseInt(s), 11, 31)
  }

  // ISO / ISO-like — extract YYYY-MM-DD regardless of trailing precision
  // Handles: "2024-03-31", "2024-03-31T00:00:00", "2024-03-31T00:00:00.0000000"
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
    if (!isNaN(d.getTime())) return d
  }

  // UK format: "31/03/2024" or "31-03-2024"
  const ukMatch = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (ukMatch) {
    const d = new Date(parseInt(ukMatch[3]), parseInt(ukMatch[2]) - 1, parseInt(ukMatch[1]))
    if (!isNaN(d.getTime())) return d
  }

  // US format: "03/31/2024"
  const usMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (usMatch) {
    const d = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]))
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1990) return d
  }

  // Numeric string timestamp
  if (/^-?\d{10,13}$/.test(s)) {
    const n = parseInt(s)
    const d = new Date(Math.abs(n) > 1e10 ? n : n * 1000)
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1990) return d
  }

  // Last resort: let JS try to parse it
  const fallback = new Date(s)
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 1990) return fallback

  return null
}

function formatYear(endDate: string | null | undefined, fallbackYear?: number): string {
  const d = parseEndDate(endDate)
  if (!d && fallbackYear) return `${fallbackYear - 1}-${String(fallbackYear).slice(2)}`
  if (!d) return 'Unknown'
  const endYr = d.getFullYear()
  const endMo = d.getMonth() + 1
  // if period ends before July, financial year is prev-current
  const startYr = endMo <= 6 ? endYr - 1 : endYr
  return `${startYr}-${String(endYr).slice(2)}`
}

function calcHealthStatus(
  deficitYears: number,
  totalYears: number,
  growthPct: number
): { status: FinancialIntelligence['healthStatus']; color: FinancialIntelligence['healthColor'] } {
  const deficitRatio = totalYears > 0 ? deficitYears / totalYears : 0

  if (deficitRatio <= 0.15 && growthPct >= 0) {
    return { status: 'FINANCIALLY HEALTHY', color: 'green' }
  }
  if (deficitRatio <= 0.3 && growthPct >= -10) {
    return { status: 'FINANCIALLY STABLE', color: 'amber' }
  }
  if (deficitRatio <= 0.5) {
    return { status: 'FINANCIAL CONCERN', color: 'amber' }
  }
  return { status: 'FINANCIAL RISK', color: 'red' }
}

async function generateAiAnalysis(
  charityName: string,
  years: YearlyFinancial[],
  grantAmount?: number
): Promise<{ summary: string; grantContext: string }> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { summary: 'AI analysis unavailable.', grantContext: '' }

  const sorted = [...years].sort((a, b) => a.endYear - b.endYear)
  const tableText = sorted
    .map(y => `${y.year}: Income £${(y.income / 1000).toFixed(0)}k, ${y.surplus >= 0 ? '+' : ''}£${(y.surplus / 1000).toFixed(0)}k ${y.surplus >= 0 ? 'surplus' : 'deficit'}`)
    .join('\n')

  const latestIncome = sorted[sorted.length - 1]?.income ?? 0
  const grantLine = grantAmount
    ? `\nGrant being considered: £${grantAmount.toLocaleString()} (${((grantAmount / latestIncome) * 100).toFixed(1)}% of latest income).`
    : ''

  const prompt = `You are a UK charity financial analyst. Analyse this charity's financial history and write two short outputs.

Charity: ${charityName}
Financial history (oldest → newest):
${tableText}${grantLine}

Write:
1. SUMMARY (2-3 sentences): Key financial story — growth trend, any deficits and why, overall health assessment. End with "Risk: LOW/MEDIUM/HIGH."
2. GRANT_CONTEXT (1 sentence, only if a grant amount was provided): How the grant amount compares to their annual income, and whether it's within acceptable range.

Return JSON only:
{"summary": "...", "grantContext": "..."}`

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: 'You are a UK charity finance expert. Return valid JSON only, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json() as { content?: Array<{ text: string }> }
    const raw  = data.content?.[0]?.text ?? '{}'
    const parsed = JSON.parse(raw.replace(/^```json?\s*/i, '').replace(/```$/,'').trim())
    return {
      summary:      parsed.summary      ?? '',
      grantContext: parsed.grantContext  ?? '',
    }
  } catch {
    return { summary: 'AI analysis unavailable.', grantContext: '' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { charityNumber, charityName, grantAmount } = await req.json() as {
      charityNumber: string
      charityName?: string
      grantAmount?: number
    }

    if (!charityNumber) {
      return NextResponse.json({ error: 'charityNumber required' }, { status: 400 })
    }

    const num    = String(charityNumber).replace(/\D/g, '')
    const apiKey = process.env.CHARITY_COMMISSION_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'CC API not configured' }, { status: 502 })
    }

    // ── Fetch basic details (name, latest income) ────────────────────────────
    const basicRes = await fetch(
      `https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2/${num}/0`,
      {
        headers: {
          Accept: 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        cache: 'no-store',
      }
    )

    if (!basicRes.ok) {
      return NextResponse.json({ error: 'charity_not_found' }, { status: 404 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const basic: any = await basicRes.json()

    // ── Fetch financial history ──────────────────────────────────────────────
    const finRes = await fetch(
      `https://api.charitycommission.gov.uk/register/api/charityFinancialHistory/${num}/0`,
      {
        headers: {
          Accept: 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        cache: 'no-store',
      }
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawFinancials: any[] = []
    if (finRes.ok) {
      const finData = await finRes.json()
      rawFinancials = Array.isArray(finData) ? finData : (finData?.data ?? finData?.financials ?? finData?.charity_annual_return_history ?? [])
      // Log first record keys to help diagnose field name mismatches
      if (rawFinancials.length > 0) {
        console.log('[financials] first record keys:', Object.keys(rawFinancials[0]))
        console.log('[financials] first record sample:', JSON.stringify(rawFinancials[0]).slice(0, 300))
      }
    }

    // ── Parse yearly financials ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function extractDate(r: any): string | number | null {
      // 1. Try all known named fields
      const KNOWN = [
        'fin_period_end_date', 'period_end', 'financialPeriodEndDate',
        'fin_end_date', 'end_date', 'periodEndDate', 'FinancialPeriodEndDate',
        'financial_period_end_date', 'date_of_extract', 'report_date',
        'fin_period_start_date', 'start_date', 'period_start_date',
        'date', 'year_end', 'yearEnd', 'financial_year',
      ]
      for (const k of KNOWN) {
        if (r[k] != null && r[k] !== '') return r[k]
      }
      // 2. Scan ALL string fields for anything that looks like a date
      for (const val of Object.values(r)) {
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val
        if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(val)) return val
      }
      // 3. Scan for plain 4-digit year numbers
      for (const [, val] of Object.entries(r)) {
        if (typeof val === 'number' && val >= 1990 && val <= 2035) return val
      }
      return null
    }

    const years: YearlyFinancial[] = rawFinancials
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any, idx: number) => {
        const endDateRaw = extractDate(r)

        const income  = Number(r.income ?? r.total_income ?? r.totalIncome ?? r.Income ?? 0)
        const expend  = Number(r.expenditure ?? r.total_expenditure ?? r.totalExpenditure ?? r.Expenditure ?? 0)
        const surplus = income - expend

        const parsed  = parseEndDate(endDateRaw)
        const endYear = parsed ? parsed.getFullYear() : (new Date().getFullYear() - idx)

        return {
          year: formatYear(endDateRaw != null ? String(endDateRaw) : null, endYear),
          endYear,
          income,
          expenditure: expend,
          surplus,
        }
      })
      .filter(y => y.income > 0)
      .sort((a, b) => a.endYear - b.endYear)
      .slice(-10) // last 10 years

    const name      = charityName || (basic.charity_name ?? '').trim()
    const latest    = years[years.length - 1]
    const fiveAgo   = years.length >= 5 ? years[years.length - 5] : null
    const tenAgo    = years.length >= 10 ? years[0] : null

    const latestIncome   = latest?.income ?? basic.latest_income ?? 0
    const fiveYearGrowth = fiveAgo && fiveAgo.income > 0
      ? Math.round(((latestIncome - fiveAgo.income) / fiveAgo.income) * 100)
      : 0
    const tenYearGrowth  = tenAgo && tenAgo.income > 0
      ? Math.round(((latestIncome - tenAgo.income) / tenAgo.income) * 100)
      : 0

    const deficitYears = years.filter(y => y.surplus < 0).length
    const totalYears   = years.length

    const { status, color } = calcHealthStatus(deficitYears, totalYears, fiveYearGrowth)

    // ── AI analysis ──────────────────────────────────────────────────────────
    const { summary, grantContext } = await generateAiAnalysis(name, years, grantAmount)

    const result: FinancialIntelligence = {
      charityName: name,
      regNumber: String(basic.reg_charity_number ?? num),
      latestIncome,
      fiveYearGrowth,
      tenYearGrowth,
      deficitYears,
      totalYears,
      reservesMonths: null, // CC API doesn't expose reserves directly
      healthStatus: status,
      healthColor: color,
      years,
      aiSummary: summary,
      grantContext,
    }

    // Temporary debug: include raw first record so we can see what CC API returns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _debug = rawFinancials.length > 0 ? {
      recordCount: rawFinancials.length,
      firstRecordKeys: Object.keys(rawFinancials[0]),
      firstRecord: rawFinancials[0],
    } : { recordCount: 0, note: 'no financial records returned' }

    return NextResponse.json({ ...result, _debug })
  } catch (err) {
    console.error('financials route error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
