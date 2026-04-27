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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

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

    // ── Step 1: Check local CC database first (fast, no API key needed) ───────
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const { data: core } = await supabase
          .from('cc_charity_core')
          .select('*')
          .eq('registration_number', num)
          .single()

        if (core) {
          // Fetch supporting data
          const [
            { data: finRows },
            { data: geoRows },
            { data: classRows },
            { data: trusteeRows },
          ] = await Promise.all([
            supabase.from('cc_financial_history').select('income_total, period_end_date').eq('registration_number', num).order('period_end_date', { ascending: false }).limit(1),
            supabase.from('cc_geographic_area').select('geographic_area').eq('registration_number', num),
            supabase.from('cc_classification').select('classification_desc, classification_type').eq('registration_number', num).eq('classification_type', 'What'),
            supabase.from('cc_trustee').select('trustee_name').eq('registration_number', num).limit(20),
          ])

          const latestFin   = finRows?.[0]
          const income      = Number(latestFin?.income_total ?? 0)
          const geoAreas    = (geoRows ?? []).map((g: { geographic_area: string }) => g.geographic_area).join(', ')
          const causes      = (classRows ?? []).map((c: { classification_desc: string }) => c.classification_desc).filter(Boolean).join(', ')
          const trustees    = (trusteeRows ?? []).map((t: { trustee_name: string }) => t.trustee_name)
          const yearsOperating = core.date_of_registration
            ? Math.floor((Date.now() - new Date(core.date_of_registration).getTime()) / (365.25 * 24 * 3600 * 1000))
            : null

          const activities = core.charity_activities || core.charitable_objects || ''
          const city = core.contact_address3 || core.contact_address2 || core.contact_address1 || ''
          const location = [city, core.contact_postcode].filter(Boolean).join(', ')

          return NextResponse.json({
            source: 'local_db',
            name: core.charity_name.trim(),
            registrationNumber: num,
            activities,
            annualIncome: incomeToBracket(income),
            incomeRaw: income,
            incomeDisplay: formatIncome(income),
            incomeYear: latestFin?.period_end_date ? new Date(latestFin.period_end_date).getFullYear() : null,
            location,
            geographicSpread: geoAreas,
            website: (core.contact_web ?? '').trim(),
            email: (core.contact_email ?? '').trim(),
            phone: (core.contact_phone ?? '').trim(),
            causes,
            giftAid: core.charity_gift_aid,
            yearsOperating,
            registeredSince: core.date_of_registration,
            trusteeCount: trustees.length,
            trustees: trustees.slice(0, 10),
            registrationStatus: core.registration_status,
          })
        }
      } catch (dbErr) {
        // DB lookup failed — fall through to live CC API
        console.warn('Local DB lookup failed, trying CC API:', dbErr)
      }
    }

    // ── Step 2: Fall back to live CC API ─────────────────────────────────────
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
      source: 'live_api',
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
