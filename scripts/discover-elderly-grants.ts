import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    const lines = readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  } catch { /**/ }
}

async function tavilySearch(query: string): Promise<{ title: string; url: string; content: string }[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 7,
      include_answer: false,
    }),
  })
  const data = await res.json() as { results: { title: string; url: string; content: string }[] }
  return data.results ?? []
}

async function extractGrantsWithAI(results: { title: string; url: string; content: string }[], context: string): Promise<object[]> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Extract open grant opportunities from these search results for UK elderly/social care charities.
Context: ${context}

Search results:
${results.map(r => `URL: ${r.url}\nTitle: ${r.title}\nContent: ${r.content.slice(0, 600)}`).join('\n\n---\n\n')}

For each REAL, CURRENTLY OPEN grant programme found, return a JSON array:
[{
  "name": "Grant programme name",
  "funder": "Funder organisation name",
  "funder_type": "Foundation|Trust|Lottery|Government|Corporate",
  "description": "What the grant funds (2-3 sentences)",
  "eligibility_criteria": "Who can apply and key criteria",
  "min_award": 0,
  "max_award": 50000,
  "deadline": "YYYY-MM-DD or null if rolling",
  "application_url": "Direct URL to apply or find out more",
  "sectors": ["elderly", "health", "community"],
  "locations": ["England", "Surrey", "United Kingdom"],
  "income_requirements": "any size|under 500k|under 100k",
  "currency": "GBP"
}]

Only include grants that:
- Are currently open or rolling (not closed)
- Are relevant to elderly, social care, or community charities
- Are based in England or UK-wide
- Have a real application URL

Return empty array [] if no valid grants found. Return ONLY valid JSON.`
    }]
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

async function main() {
  loadEnv()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const searches = [
    'open grants elderly charities England 2026 apply now',
    'UK small charity grants older people social care 2026 open applications',
    'Surrey community foundation grants elderly 2025 2026',
    'National Lottery Community Fund grants elderly England open 2026',
    'Garfield Weston Foundation grants open 2026 elderly community',
    'Tudor Trust grants open elderly vulnerable adults UK 2026',
    'Age UK grants elderly charities open applications 2026',
    'community grants older people Surrey Kent Sussex open 2026',
    'small grants elderly poor vulnerable UK charity open rolling',
  ]

  const context = 'Small registered charity (OXTED UNITED CHARITIES) in Oxted, Surrey helping poor, sick and elderly people. Annual income under £100k.'
  
  const allGrants: object[] = []
  const seenUrls = new Set<string>()

  for (const query of searches) {
    console.log(`\n🔍 Searching: "${query}"`)
    try {
      const results = await tavilySearch(query)
      console.log(`   Found ${results.length} results`)
      const grants = await extractGrantsWithAI(results, context)
      console.log(`   Extracted ${grants.length} grants`)
      
      for (const g of grants) {
        const grant = g as { application_url?: string }
        if (grant.application_url && !seenUrls.has(grant.application_url)) {
          seenUrls.add(grant.application_url)
          allGrants.push(g)
        }
      }
    } catch (e) {
      console.error('Search error:', e)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n\n📋 Total unique grants found: ${allGrants.length}`)
  console.log(allGrants.map((g: object) => {
    const grant = g as { name: string; funder: string; deadline: string; max_award: number }
    return `  • ${grant.name} | ${grant.funder} | deadline: ${grant.deadline ?? 'rolling'} | up to £${grant.max_award?.toLocaleString()}`
  }).join('\n'))

  if (allGrants.length === 0) {
    console.log('No grants found to import.')
    return
  }

  // Insert into DB
  const today = new Date().toISOString().split('T')[0]
  const rows = allGrants.map((g: object) => {
    const grant = g as {
      name: string; funder: string; funder_type: string; description: string;
      eligibility_criteria: string; min_award: number; max_award: number;
      deadline: string | null; application_url: string; sectors: string[];
      locations: string[]; income_requirements: string; currency: string
    }
    return {
      name: grant.name?.slice(0, 255),
      funder: grant.funder?.slice(0, 255),
      funder_type: grant.funder_type ?? 'Trust',
      description: grant.description?.slice(0, 800),
      eligibility_criteria: grant.eligibility_criteria?.slice(0, 800),
      min_award: grant.min_award ?? 0,
      max_award: grant.max_award ?? 0,
      deadline: grant.deadline && grant.deadline >= today ? grant.deadline : null,
      application_url: grant.application_url,
      sectors: grant.sectors ?? ['elderly'],
      locations: grant.locations ?? ['United Kingdom'],
      income_requirements: grant.income_requirements ?? 'any size',
      country: 'United Kingdom',
      currency: grant.currency ?? 'GBP',
      source: 'discovery',
      is_active: true,
      public_title: `${grant.funder_type ?? 'UK'} Grant Opportunity`,
      public_description: 'Grant funding available for eligible UK charities. Upgrade to Pro to see full details.',
    }
  })

  const { data, error } = await supabase
    .from('grants')
    .upsert(rows, { onConflict: 'application_url', ignoreDuplicates: false })
    .select('id')

  if (error) {
    console.error('❌ Insert error:', error.message)
  } else {
    console.log(`\n✅ ${data?.length ?? rows.length} grants saved to database`)
  }
}

main().catch(console.error)
