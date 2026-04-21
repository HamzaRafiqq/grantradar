import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  children: ['children charity grants UK', 'young people funding UK', 'youth grants UK'],
  education: ['education charity grants UK', 'learning funding UK'],
  health: ['health charity grants UK', 'wellbeing funding UK', 'mental health grants UK'],
  environment: ['environmental charity grants UK', 'climate funding UK', 'conservation grants UK'],
  arts: ['arts charity grants UK', 'culture funding UK', 'creative grants UK'],
  community: ['community grants UK', 'neighbourhood funding UK'],
  housing: ['housing charity grants UK', 'homelessness funding UK'],
  disability: ['disability charity grants UK', 'accessibility funding UK'],
  elderly: ['elderly care grants UK', 'older people funding UK'],
  other: ['charity grants UK 2025', 'voluntary sector funding UK'],
}

async function searchGrants(sector: string, location: string): Promise<string[]> {
  const queries = SECTOR_MAP[sector] ?? SECTOR_MAP['other']
  const urls: string[] = []

  for (const query of queries.slice(0, 2)) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} apply now open 2025 2026`,
        max_results: 5,
        include_domains: [],
        exclude_domains: ['wikipedia.org', 'linkedin.com', 'facebook.com', 'twitter.com'],
      }),
    })
    const data = await res.json()
    if (data.results) {
      urls.push(...data.results.map((r: { url: string }) => r.url))
    }
  }

  return [...new Set(urls)].slice(0, 8)
}

async function extractGrantFromPage(url: string, orgSector: string, orgLocation: string): Promise<DiscoveredGrant | null> {
  try {
    const res = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        urls: [url],
      }),
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
          content: `Extract grant details from this page content. Return a single JSON object or null if not a grant opportunity.

Required JSON format:
{
  "name": "Grant name",
  "funder": "Organisation name",
  "description": "1-2 sentences about what it funds",
  "eligibility_criteria": "Who can apply",
  "sectors": ["one of: children, education, health, environment, arts, community, housing, disability, elderly, other"],
  "locations": ["one or more of: England, Scotland, Wales, Northern Ireland, UK-wide, or specific UK regions"],
  "income_requirements": "income requirements or empty string",
  "min_award": 0,
  "max_award": 0,
  "deadline": "YYYY-MM-DD or empty string if rolling/unknown",
  "application_url": "${url}"
}

Page content (first 3000 chars):
${content.slice(0, 3000)}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    if (raw === 'null' || !raw) return null
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const grant = JSON.parse(cleaned) as DiscoveredGrant

    if (!grant.name || !grant.funder || grant.max_award === 0) return null
    if (!grant.deadline) grant.deadline = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    return grant
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json({ error: 'TAVILY_API_KEY not set' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
    }

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

    // Search for grant URLs
    const urls = await searchGrants(org.sector, org.location)

    // Extract grant data from each page
    const results = await Promise.allSettled(
      urls.map(url => extractGrantFromPage(url, org.sector, org.location))
    )

    const grants = results
      .filter((r): r is PromiseFulfilledResult<DiscoveredGrant> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)

    if (grants.length === 0) {
      return NextResponse.json({ discovered: 0, message: 'No new grants found on this search' })
    }

    // Upsert into grants table (use application_url as unique key to avoid duplicates)
    const rows = grants.map(g => ({
      name: g.name,
      funder: g.funder,
      description: g.description,
      eligibility_criteria: g.eligibility_criteria,
      sectors: g.sectors,
      locations: g.locations,
      income_requirements: g.income_requirements,
      min_award: g.min_award,
      max_award: g.max_award,
      deadline: g.deadline || null,
      application_url: g.application_url,
      is_active: true,
    }))

    const { data: inserted } = await serviceSupabase
      .from('grants')
      .upsert(rows, { onConflict: 'application_url', ignoreDuplicates: true })
      .select('id')

    return NextResponse.json({
      discovered: inserted?.length ?? grants.length,
      total_found: grants.length,
    })
  } catch (err) {
    console.error('Discover error:', err)
    return NextResponse.json({ error: 'Discovery failed' }, { status: 500 })
  }
}
