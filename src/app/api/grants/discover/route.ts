import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type DiscoveredGrant = {
  name: string
  funder: string
  description: string
  eligibility_criteria: string
  sectors: string[]
  locations: string[]
  income_requirements: string
  min_award: number
  max_award: number
  deadline: string
  application_url: string
}

const SECTOR_MAP: Record<string, string[]> = {
  children: [
    'children charity grants UK 2025',
    'young people funding UK open applications',
    'youth grants UK apply now',
    'child welfare funding UK 2025 2026',
    'grants for children charities UK',
    'early years funding UK charities',
  ],
  education: [
    'education charity grants UK 2025',
    'learning funding UK open applications',
    'literacy numeracy grants UK charities',
    'skills training charity funding UK',
    'education foundation grants UK apply',
  ],
  health: [
    'health charity grants UK 2025',
    'wellbeing funding UK open applications',
    'mental health grants UK charities apply',
    'NHS community health funding UK',
    'public health charity grants UK 2025',
    'cancer charity grants UK apply now',
  ],
  environment: [
    'environmental charity grants UK 2025',
    'climate funding UK charities apply',
    'conservation grants UK open 2025',
    'sustainability charity funding UK',
    'green grants UK charities apply now',
  ],
  arts: [
    'arts charity grants UK 2025',
    'culture funding UK open applications',
    'creative arts grants UK charities',
    'Arts Council funding UK apply',
    'heritage grants UK charities 2025',
  ],
  community: [
    'community grants UK 2025 apply',
    'neighbourhood funding UK charities',
    'social cohesion grants UK open',
    'community development funding UK',
    'grassroots charity grants UK 2025',
  ],
  housing: [
    'housing charity grants UK 2025',
    'homelessness funding UK apply now',
    'affordable housing charity grants UK',
    'rough sleepers funding UK charities',
  ],
  disability: [
    'disability charity grants UK 2025',
    'accessibility funding UK charities apply',
    'disabled people charity grants UK',
    'inclusion grants UK open applications',
  ],
  elderly: [
    'elderly care grants UK 2025',
    'older people funding UK charities apply',
    'age charity grants UK open 2025',
    'dementia care funding UK charities',
  ],
  other: [
    'UK charity grants 2025 apply now',
    'voluntary sector funding UK open',
    'small charity grants UK 2025',
    'charitable trust grants UK apply',
    'Lottery funding UK charities open',
    'community foundation grants UK 2025',
  ],
}

const TRUSTED_DOMAINS = [
  'groundwork.org.uk',
  'lotterygoodcauses.org.uk',
  'tnlcommunityfund.org.uk',
  'biglotteryfund.org.uk',
  'gov.uk',
  'ncvo.org.uk',
  'charityexcellence.co.uk',
  'grantsonline.org.uk',
  'fundinginformation.org',
  'cafonline.org',
  'tudor-trust.org.uk',
  'esmee-fairbairn.org.uk',
  'lloydsbankfoundation.org.uk',
  'comicrelief.com',
  'nesta.org.uk',
]

async function searchGrants(sector: string, location: string): Promise<string[]> {
  const queries = SECTOR_MAP[sector] ?? SECTOR_MAP['other']
  const urlSet = new Set<string>()

  for (const query of queries) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: 10,
          exclude_domains: ['wikipedia.org', 'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com'],
        }),
      })
      const data = await res.json()
      if (data.results) {
        data.results.forEach((r: { url: string }) => urlSet.add(r.url))
      }
    } catch {
      // continue with other queries
    }
  }

  // Prioritise trusted grant domains
  const all = [...urlSet]
  const trusted = all.filter(u => TRUSTED_DOMAINS.some(d => u.includes(d)))
  const rest = all.filter(u => !TRUSTED_DOMAINS.some(d => u.includes(d)))

  return [...trusted, ...rest].slice(0, 30)
}

async function extractGrantFromPage(url: string): Promise<DiscoveredGrant | null> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, urls: [url] }),
    })
    const data = await res.json()
    const content = data.results?.[0]?.raw_content ?? ''
    if (!content || content.length < 200) return null

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are a UK grant data extractor. Extract grant details from webpage content and return valid JSON only. If the page does not describe a specific grant opportunity, return null. Today is ${new Date().toISOString().split('T')[0]}.`,
      messages: [
        {
          role: 'user',
          content: `Extract grant details from this page. Return a single JSON object or null if not a specific grant opportunity.

Required JSON format:
{
  "name": "Grant name",
  "funder": "Organisation name",
  "description": "1-2 sentences about what it funds",
  "eligibility_criteria": "Who can apply",
  "sectors": ["one of: children, education, health, environment, arts, community, housing, disability, elderly, other"],
  "locations": ["one or more of: England, Scotland, Wales, Northern Ireland, UK-wide"],
  "income_requirements": "income requirements or empty string",
  "min_award": 0,
  "max_award": 0,
  "deadline": "YYYY-MM-DD or empty string if rolling",
  "application_url": "${url}"
}

Page content:
${content.slice(0, 4000)}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    if (raw === 'null' || !raw) return null
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const grant = JSON.parse(cleaned) as DiscoveredGrant

    if (!grant.name || !grant.funder) return null
    if (!grant.deadline) grant.deadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    return grant
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TAVILY_API_KEY) return NextResponse.json({ error: 'TAVILY_API_KEY not set' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })

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

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const urls = await searchGrants(org.sector, org.location)

    // Process in batches of 5 to avoid rate limits
    const grants: DiscoveredGrant[] = []
    for (let i = 0; i < urls.length; i += 5) {
      const batch = urls.slice(i, i + 5)
      const results = await Promise.allSettled(batch.map(url => extractGrantFromPage(url)))
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value !== null) grants.push(r.value)
      })
    }

    if (grants.length === 0) return NextResponse.json({ discovered: 0, message: 'No new grants found' })

    const rows = grants.map(g => ({
      name: g.name,
      funder: g.funder,
      description: g.description,
      eligibility_criteria: g.eligibility_criteria,
      sectors: g.sectors,
      locations: g.locations,
      income_requirements: g.income_requirements,
      min_award: g.min_award ?? 0,
      max_award: g.max_award ?? 0,
      deadline: g.deadline || null,
      application_url: g.application_url,
      is_active: true,
    }))

    const { data: inserted } = await serviceSupabase
      .from('grants')
      .upsert(rows, { onConflict: 'application_url', ignoreDuplicates: true })
      .select('id')

    return NextResponse.json({ discovered: inserted?.length ?? grants.length, total_found: grants.length })
  } catch (err) {
    console.error('Discover error:', err)
    return NextResponse.json({ error: 'Discovery failed' }, { status: 500 })
  }
}
