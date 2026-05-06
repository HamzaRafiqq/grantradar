import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type Grant = {
  id: string
  name: string
  funder: string
  description: string
  eligibility_criteria: string
  sectors: string[]
  locations: string[]
  income_requirements: string
  min_award: number
  max_award: number
  country?: string
  region?: string
  currency?: string
}

type Org = {
  name: string
  sector: string
  location: string
  country?: string
  currency?: string
  annual_income: string
  registered_charity: boolean
  beneficiaries: string
  current_projects: string
}

function isGlobalGrant(grant: Grant) {
  return (
    grant.country === 'Global' ||
    grant.locations?.includes('Global') ||
    grant.locations?.includes('International')
  )
}

function countryMatches(org: Org, grant: Grant) {
  if (isGlobalGrant(grant)) return true
  if (!org.country) return true
  return grant.country === org.country
}

// Rule-based matching used when no Anthropic API key is set
function ruleBasedMatch(org: Org, grants: Grant[]) {
  return grants
    .map((grant) => {
      let score = 5

      // Country match (highest priority — 30 pts equiv scaled to 10-pt system = +3)
      const countryMatch = countryMatches(org, grant)
      if (countryMatch) score += 3
      else score -= 2

      // Cause area match (+2)
      const sectorMatch = grant.sectors.includes(org.sector) || grant.sectors.includes('other')
      if (sectorMatch) score += 2

      // Income eligibility (+1.5)
      const req = (grant.income_requirements ?? '').toLowerCase()
      const income = org.annual_income
      const incomeOk =
        !req || req === 'any size' ||
        (income === 'under_100k' && !req.includes('above') && !req.includes('over_500k')) ||
        (income === '100k_500k') ||
        (income === 'over_500k' && !req.includes('under'))
      if (incomeOk) score += 1

      // Cap at 10
      score = Math.min(10, Math.max(1, score))

      if (score < 3) return null

      const sectorLabel = org.sector.charAt(0).toUpperCase() + org.sector.slice(1)
      const countryLabel = org.country ?? 'your country'
      const match_reason = sectorMatch && countryMatch
        ? `${org.name} works in ${sectorLabel.toLowerCase()} and is based in ${countryLabel}, which aligns well with this grant's priorities.`
        : sectorMatch
          ? `${org.name} works in ${sectorLabel.toLowerCase()}, which is a priority sector for this grant.`
          : `${org.name} meets the eligibility criteria for organisation type and income level.`

      const watch_out = !countryMatch
        ? `This grant targets ${grant.country ?? 'another country'} — verify international applications are accepted.`
        : !sectorMatch
          ? `Your primary sector (${org.sector}) isn't listed — confirm your work fits their priorities before applying.`
          : null

      return { grant_id: grant.id, eligibility_score: score, match_reason, watch_out }
    })
    .filter(Boolean) as Array<{
      grant_id: string
      eligibility_score: number
      match_reason: string
      watch_out: string | null
    }>
}

async function aiMatchBatch(org: Org, grants: Grant[]) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const orgProfile = `Name: ${org.name}
Sector: ${org.sector}
Country: ${org.country ?? 'Unknown'}
Location: ${org.location}
Annual Income: ${org.annual_income}
Registered: ${org.registered_charity ? 'Yes' : 'No'}
Who We Help: ${org.beneficiaries}
Current Projects: ${org.current_projects}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are a global nonprofit grant eligibility expert. Score each grant for this organisation from 1-10 using:
- Country match: 30 pts (grants from org's country or marked Global score highest)
- Cause area match: 35 pts
- Income eligibility: 20 pts
- Deadline validity: 15 pts
Return grants scoring 5+. Cast a wide net — include grants that are a reasonable fit even if not perfect. Be specific about why the org qualifies. Return valid JSON array only — no markdown.`,
    messages: [
      {
        role: 'user',
        content: `Organisation:\n${orgProfile}\n\nGrants:\n${JSON.stringify(grants.map(g => ({
          id: g.id, name: g.name, funder: g.funder, description: g.description,
          eligibility_criteria: g.eligibility_criteria, sectors: g.sectors,
          locations: g.locations, income_requirements: g.income_requirements,
        })))}\n\nReturn JSON array: [{grant_id, eligibility_score (6-10), match_reason (1 sentence), watch_out (1 sentence or null)}]`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function aiMatch(org: Org, grants: Grant[]) {
  const BATCH_SIZE = 40
  const allMatches: Array<{ grant_id: string; eligibility_score: number; match_reason: string; watch_out: string | null }> = []

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE)
    try {
      const matches = await aiMatchBatch(org, batch)
      allMatches.push(...matches)
    } catch {
      // fall back to rule-based for this batch
      allMatches.push(...ruleBasedMatch(org, batch))
    }
  }

  return allMatches
}

export async function POST(req: NextRequest) {
  try {
    const { organisationId } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: org } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', organisationId)
      .eq('user_id', user.id)
      .single()

    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

    const today = new Date().toISOString().split('T')[0]
    // Only match against curated open grants:
    // - source = 'manual' or 'discovery' (never 360Giving — that data is historical distributions)
    // - is_active = true
    // - deadline in future OR no deadline (rolling)
    // - country matches org country (or United Kingdom for UK orgs)
    const orgCountry = org.country ?? 'United Kingdom'
    const { data: grants } = await supabase
      .from('grants')
      .select('*')
      .eq('is_active', true)
      .eq('grant_type', 'opportunity')
      .eq('country', orgCountry)
      .or(`deadline.gte.${today},deadline.is.null`)
      .not('funder', 'ilike', '%National Institutes%')
      .not('funder', 'ilike', '%NIH%')
      .not('name', 'ilike', '%R01%')
      .not('name', 'ilike', '%R34%')
      .not('name', 'ilike', '%K22%')
      .not('name', 'ilike', '%BRAIN Initiative%')
    if (!grants || grants.length === 0) return NextResponse.json({ count: 0 })

    // Use AI if key is set, otherwise rule-based matching
    let matches
    if (process.env.ANTHROPIC_API_KEY) {
      matches = await aiMatch(org, grants)
    } else {
      matches = ruleBasedMatch(org, grants)
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Sort by score desc and take top 20
    matches.sort((a: { eligibility_score: number }, b: { eligibility_score: number }) => b.eligibility_score - a.eligibility_score)
    const top20 = matches.slice(0, 20)

    const rows = top20.map((m: { grant_id: string; eligibility_score: number; match_reason: string; watch_out: string | null }) => ({
      user_id: user.id,
      grant_id: m.grant_id,
      eligibility_score: m.eligibility_score,
      match_reason: m.match_reason,
      watch_out: m.watch_out ?? '',
      status: 'new',
    }))

    if (rows.length > 0) {
      await serviceSupabase
        .from('grant_matches')
        .upsert(rows, { onConflict: 'user_id,grant_id', ignoreDuplicates: false })
    }

    // Fire grants-ready email (non-blocking)
    if (rows.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'
      fetch(`${appUrl}/api/email/grants-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, count: rows.length }),
      }).catch(() => {})
    }

    return NextResponse.json({ count: rows.length, total_scored: matches.length })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
