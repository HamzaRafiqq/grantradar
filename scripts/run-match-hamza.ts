import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

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
  } catch { /* ignore */ }
}

async function main() {
  loadEnv()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const USER_ID = 'bd7b04b5-03ca-463d-a9da-6d847871fa35'
  const today = new Date().toISOString().split('T')[0]

  // Get org
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', USER_ID).single()
  console.log('Org:', org.name, '| Sector:', org.sector)

  // Only use curated open grants — never 360Giving (historical distributions)
  const { data: grants } = await supabase
    .from('grants')
    .select('id,name,funder,funder_type,description,eligibility_criteria,sectors,locations,min_award,max_award,deadline,country,source')
    .eq('is_active', true)
    .eq('country', 'United Kingdom')
    .in('source', ['manual', 'discovery'])
    .or(`deadline.gte.${today},deadline.is.null`)

  console.log(`Found ${grants?.length ?? 0} curated open UK grants`)
  grants?.forEach(g => console.log(`  ${g.deadline ?? 'rolling'} | ${g.source} | ${g.name?.slice(0, 55)}`))

  const pool = grants ?? []

  if (!pool.length) { console.log('No grants found!'); return }

  // AI match in batches of 20
  const allMatches: Array<{ grant_id: string; eligibility_score: number; match_reason: string; watch_out: string | null }> = []
  const BATCH = 20

  for (let i = 0; i < Math.min(pool.length, 200); i += BATCH) {
    const batch = pool.slice(i, i + BATCH)
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are a grant matching expert for UK charities.

Charity: ${org.name}
Sector: ${org.sector}
Location: ${org.location}
Annual income: ${org.annual_income}
Beneficiaries: ${org.beneficiaries}

Grants to evaluate:
${JSON.stringify(batch.map(g => ({ id: g.id, name: g.name, funder: g.funder, description: g.description, eligibility_criteria: g.eligibility_criteria, sectors: g.sectors, locations: g.locations, max_award: g.max_award, deadline: g.deadline })))}

Return JSON array of matches with score 6-10 only (skip poor fits):
[{"grant_id": "...", "eligibility_score": 8, "match_reason": "1 sentence why this fits", "watch_out": "1 sentence caution or null"}]`
        }]
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const matches = JSON.parse(jsonMatch[0])
        allMatches.push(...matches)
        console.log(`Batch ${i/BATCH + 1}: ${matches.length} matches`)
      }
    } catch (e) {
      console.error('Batch error:', e)
    }
  }

  // Sort and take top 20
  allMatches.sort((a, b) => b.eligibility_score - a.eligibility_score)
  const top20 = allMatches.slice(0, 20)

  console.log(`\nTop matches:`)
  top20.forEach((m, i) => {
    const g = grants.find(g => g.id === m.grant_id)
    console.log(`  ${i+1}. [${m.eligibility_score}] ${g?.name?.slice(0,50)} — ${g?.deadline || 'Rolling'}`)
  })

  // Insert matches
  const rows = top20.map(m => ({
    user_id: USER_ID,
    grant_id: m.grant_id,
    eligibility_score: m.eligibility_score,
    match_reason: m.match_reason,
    watch_out: m.watch_out,
    status: 'new',
  }))

  const { error } = await supabase.from('grant_matches').insert(rows)
  if (error) console.error('Insert error:', error.message)
  else console.log(`\n✅ ${top20.length} fresh matches saved for ${org.name}`)
}

main().catch(console.error)
