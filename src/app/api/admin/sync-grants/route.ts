import { NextRequest, NextResponse } from 'next/server'

// ── Sector mapping from Grants.gov category codes ─────────────────────────────
const CATEGORY_TO_SECTOR: Record<string, string> = {
  AR: 'arts',
  ED: 'education',
  HL: 'health',
  CD: 'community',
  ENV: 'environment',
  HO: 'housing',
  ISS: 'community',
  ELT: 'education',
  FN: 'health',
  HU: 'arts',
  LJL: 'community',
}

function parseDateUS(dateStr: string): string | null {
  if (!dateStr) return null
  const [m, d, y] = dateStr.split('/')
  if (!m || !d || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function inferSectors(title: string, categories: string[]): string[] {
  const sectors = new Set<string>()
  for (const cat of categories) {
    if (CATEGORY_TO_SECTOR[cat]) sectors.add(CATEGORY_TO_SECTOR[cat])
  }
  const t = title.toLowerCase()
  if (t.includes('education') || t.includes('school') || t.includes('youth') || t.includes('student')) sectors.add('education')
  if (t.includes('health') || t.includes('medical') || t.includes('mental') || t.includes('substance')) sectors.add('health')
  if (t.includes('art') || t.includes('cultur') || t.includes('museum') || t.includes('humanities')) sectors.add('arts')
  if (t.includes('environment') || t.includes('climate') || t.includes('conservation') || t.includes('wildlife')) sectors.add('environment')
  if (t.includes('housing') || t.includes('homeless') || t.includes('shelter')) sectors.add('housing')
  if (t.includes('child') || t.includes('youth') || t.includes('juvenile') || t.includes('family')) sectors.add('children')
  if (t.includes('elder') || t.includes('senior') || t.includes('aging') || t.includes('older adult')) sectors.add('elderly')
  if (t.includes('disabilit') || t.includes('accessible') || t.includes('rehabilitation')) sectors.add('disability')
  if (t.includes('community') || t.includes('neighborhood') || t.includes('civic')) sectors.add('community')
  return sectors.size > 0 ? [...sectors] : ['other']
}

// ── Grants.gov sync (US federal grants for nonprofits) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncGrantsGov(supabase: any) {
  const NONPROFIT_ELIGIBILITIES = '12|13'
  const RELEVANT_CATEGORIES = 'AR|ED|HL|CD|ENV|HO|ISS|ELT|FN|HU|LJL|NR|RD'
  const PAGE_SIZE = 100
  let inserted = 0

  for (let page = 0; page < 2; page++) {
    const res = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oppStatuses: 'posted',
        eligibilities: NONPROFIT_ELIGIBILITIES,
        fundingCategories: RELEVANT_CATEGORIES,
        fundingInstruments: 'G|CA',
        rows: PAGE_SIZE,
        startRecordNum: page * PAGE_SIZE,
      }),
    })

    if (!res.ok) break
    const data = await res.json()
    const hits: Array<{
      id: string; title: string; agency: string; agencyCode: string;
      closeDate: string; openDate: string; cfdaList: string[]
    }> = data.oppHits ?? []

    if (hits.length === 0) break

    const today = new Date().toISOString().split('T')[0]
    const rows = hits
      .map(h => {
        const deadline = parseDateUS(h.closeDate)
        if (!deadline || deadline < today) return null
        return {
          name: h.title.replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').trim(),
          funder: h.agency || h.agencyCode || 'US Federal Government',
          description: `Federal grant from ${h.agency || 'US Federal Government'}. Visit Grants.gov for full eligibility details.`,
          eligibility_criteria: 'Open to 501(c)(3) nonprofits and other nonprofit organisations. See Grants.gov for specific requirements.',
          min_award: 0,
          max_award: 0,
          deadline,
          application_url: `https://www.grants.gov/search-results-detail/${h.id}`,
          sectors: inferSectors(h.title, h.cfdaList ?? []),
          locations: ['United States'],
          income_requirements: 'any size',
          is_active: true,
          country: 'United States',
          currency: 'USD',
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length === 0) continue

    const { data: upserted } = await supabase
      .from('grants')
      .upsert(rows, { onConflict: 'application_url', ignoreDuplicates: false })
      .select('id')

    inserted += (upserted ?? []).length
  }

  return { inserted, source: 'grants.gov' }
}

function makeSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Route handler (manual trigger) ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-key')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await syncGrantsGov(makeSupabase())
    return NextResponse.json({ ok: true, results: [result], timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Vercel cron (daily at 02:00 UTC) ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const result = await syncGrantsGov(makeSupabase())
    return NextResponse.json({ ok: true, results: [result], timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
