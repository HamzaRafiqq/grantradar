import { NextRequest, NextResponse } from 'next/server'

// Maps raw CC income (£) → our AnnualIncome enum
function incomeToBracket(income: number): string {
  if (!income || income <= 0) return ''
  if (income < 100_000) return 'under_100k'
  if (income <= 500_000) return '100k_500k'
  return 'over_500k'
}

// Format raw income as a readable display string
function formatIncome(income: number): string {
  if (!income || income <= 0) return ''
  if (income >= 1_000_000) return `£${(income / 1_000_000).toFixed(1)}m`
  if (income >= 1_000) return `£${(income / 1_000).toFixed(0)}k`
  return `£${income.toLocaleString()}`
}

// Build an activities description from who_what_where classifications
interface WhoWhatWhere {
  classification_type: 'What' | 'Who' | 'How'
  classification_desc: string
}

function buildActivities(wwwArr: WhoWhatWhere[]): string {
  if (!Array.isArray(wwwArr) || wwwArr.length === 0) return ''
  const what = wwwArr.filter(w => w.classification_type === 'What').map(w => w.classification_desc)
  const who  = wwwArr.filter(w => w.classification_type === 'Who').map(w => w.classification_desc)
  const parts: string[] = []
  if (what.length) parts.push(`Activities: ${what.join(', ')}.`)
  if (who.length)  parts.push(`Beneficiaries: ${who.join(', ')}.`)
  return parts.join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const { registrationNumber } = await req.json()

    if (!registrationNumber) {
      return NextResponse.json({ error: 'Registration number required' }, { status: 400 })
    }

    const num = String(registrationNumber).trim().replace(/\D/g, '')

    if (!num || num.length < 6 || num.length > 8) {
      return NextResponse.json(
        { error: 'invalid_number', message: 'Please enter a valid 6–8 digit charity number.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.CHARITY_COMMISSION_API_KEY
    if (!apiKey) {
      console.warn('CHARITY_COMMISSION_API_KEY is not set')
      return NextResponse.json(
        { error: 'cc_unavailable', message: 'Charity lookup is not configured on this server.' },
        { status: 502 }
      )
    }

    // Correct endpoint: /allcharitydetailsV2/{regNumber}/0
    // The trailing /0 is the group_subsid_suffix (0 = main charity)
    const ccRes = await fetch(
      `https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2/${num}/0`,
      {
        headers: {
          Accept: 'application/json',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        next: { revalidate: 3600 }, // cache for 1 hour
      }
    )

    if (ccRes.status === 404) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (!ccRes.ok) {
      console.error(`CC API error ${ccRes.status} for ${num}`)
      return NextResponse.json({ error: 'cc_unavailable' }, { status: 502 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await ccRes.json()

    // ── Field mapping (actual CC API response fields) ──────────────────────
    // Income
    const income: number = raw.latest_income ?? 0
    const incomeDisplay = formatIncome(income)

    // Location: prefer city line (address_line_three) + postcode, else line_two + postcode
    const city = raw.address_line_three || raw.address_line_two || raw.address_line_one || ''
    const postcode = raw.address_post_code || ''
    const location = [city, postcode].filter(Boolean).join(', ')

    // Geographic spread from CharityAoORegion array
    const regionArr: { region: string }[] = raw.CharityAoORegion ?? []
    const geographicSpread = regionArr.map(r => r.region).join(', ')

    // Activities from who_what_where classification array
    const activities = buildActivities(raw.who_what_where ?? [])

    return NextResponse.json({
      name: (raw.charity_name ?? '').trim(),
      registrationNumber: String(raw.reg_charity_number ?? num),
      activities,
      annualIncome: incomeToBracket(income),
      incomeRaw: income,
      incomeDisplay,
      location,
      geographicSpread,
      website: (raw.web ?? '').trim(),
      email: (raw.email ?? '').trim(),
    })
  } catch (err) {
    console.error('Charity Commission lookup error:', err)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
}
