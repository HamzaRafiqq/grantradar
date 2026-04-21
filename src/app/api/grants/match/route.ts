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
}

type Org = {
  name: string
  sector: string
  location: string
  annual_income: string
  registered_charity: boolean
  beneficiaries: string
  current_projects: string
}

// Rule-based matching used when no Anthropic API key is set
function ruleBasedMatch(org: Org, grants: Grant[]) {
  const ukRegionToCountry: Record<string, string> = {
    'Greater London': 'England',
    'South East England': 'England',
    'South West England': 'England',
    'East of England': 'England',
    'East Midlands': 'England',
    'West Midlands': 'England',
    'Yorkshire and the Humber': 'England',
    'North West England': 'England',
    'North East England': 'England',
    'Scotland': 'Scotland',
    'Wales': 'Wales',
    'Northern Ireland': 'Northern Ireland',
  }

  const country = ukRegionToCountry[org.location] ?? 'England'

  return grants
    .map((grant) => {
      let score = 6

      // Sector match
      const sectorMatch = grant.sectors.includes(org.sector) || grant.sectors.includes('other')
      if (sectorMatch) score += 1

      // Location match
      const locationMatch =
        grant.locations.includes(country) ||
        grant.locations.includes(org.location) ||
        grant.locations.includes('England') && country === 'England'
      if (locationMatch) score += 1

      // Income match
      const req = (grant.income_requirements ?? '').toLowerCase()
      const income = org.annual_income
      const incomeOk =
        !req ||
        (income === 'under_100k' && !req.includes('above') && !req.includes('typically above')) ||
        (income === '100k_500k') ||
        (income === 'over_500k' && !req.includes('under'))
      if (!incomeOk) score -= 2

      // Registered charity bonus
      if (org.registered_charity) score += 1

      // Cap at 10
      score = Math.min(10, Math.max(1, score))

      if (score < 6) return null

      const sectorLabel = org.sector.charAt(0).toUpperCase() + org.sector.slice(1)
      const match_reason = sectorMatch
        ? `${org.name} works in ${sectorLabel.toLowerCase()}, which is a priority sector for this grant, making it a strong candidate.`
        : `${org.name} meets the basic eligibility criteria for location and organisation type.`

      const watch_out = !locationMatch
        ? `Check that your region (${org.location}) is explicitly covered by this funder's geographic criteria.`
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

  const charityProfile = `Name: ${org.name}
Sector: ${org.sector}
Location: ${org.location}
Annual Income: ${org.annual_income}
Registered Charity: ${org.registered_charity ? 'Yes' : 'No'}
Who We Help: ${org.beneficiaries}
Current Projects: ${org.current_projects}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are a UK grant eligibility expert. Score each grant for this charity from 1-10. Return ONLY grants scoring 6+. Be specific. Return valid JSON array only — no markdown.`,
    messages: [
      {
        role: 'user',
        content: `Charity:\n${charityProfile}\n\nGrants:\n${JSON.stringify(grants.map(g => ({
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

    const { data: grants } = await supabase.from('grants').select('*').eq('is_active', true)
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

    const rows = matches.map((m: { grant_id: string; eligibility_score: number; match_reason: string; watch_out: string | null }) => ({
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

    return NextResponse.json({ count: rows.length })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
