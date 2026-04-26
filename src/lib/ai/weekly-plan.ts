/**
 * Weekly AI Action Plan generator — Claude-powered weekly planning for UK charities.
 * Server-side only. Calls the Anthropic Messages API directly.
 */

import { createClient } from '@/lib/supabase/server'
import { calculateTrustScore } from '@/lib/trust-score'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'

function apiHeaders() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set in environment variables')
  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyTask {
  title: string
  description: string
  estimated_minutes: number
  link?: string
}

export interface WeeklyPlan {
  urgent: WeeklyTask[]       // 2-3 time-sensitive tasks
  important: WeeklyTask[]    // 3-4 high impact tasks
  social_media: WeeklyTask[] // exactly 3 post ideas
  ai_recommendation: string  // one strategic insight
  metrics: {
    trust_score: number
    active_applications: number
    grants_closing_week: number
    total_potential: number
  }
}

interface ClaudePlanResponse {
  urgent: WeeklyTask[]
  important: WeeklyTask[]
  social_media: WeeklyTask[]
  ai_recommendation: string
}

// ── Helper ─────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function parseClaudeJson(text: string): ClaudePlanResponse {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned) as ClaudePlanResponse
}

// ── Main generator ─────────────────────────────────────────────────────────

export async function generateWeeklyPlan(userId: string): Promise<WeeklyPlan> {
  const supabase = await createClient()

  // 1. Fetch organisation
  const { data: org } = await supabase
    .from('organisations')
    .select('id, name, charity_number')
    .eq('user_id', userId)
    .single()

  if (!org) throw new Error('Organisation not found for user')

  // 2. Fetch latest trust score (same logic as dashboard)
  const { data: trustHistory } = await supabase
    .from('trust_score_history')
    .select('total_score, improvements')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let trustScore = trustHistory?.total_score ?? 0
  let improvements = (trustHistory?.improvements as string[]) ?? []

  // If no history entry, calculate live (same fallback as dashboard)
  if (!trustHistory) {
    try {
      const result = await calculateTrustScore(org.id, supabase)
      trustScore = result.total
      improvements = result.improvements
    } catch {
      trustScore = 0
      improvements = []
    }
  }

  // 3. Fetch active grant matches (exclude won/lost)
  const { data: matches } = await supabase
    .from('grant_matches')
    .select('id, eligibility_score, status, grant:grants(id, name, funder, deadline, max_award)')
    .eq('user_id', userId)
    .not('status', 'in', '(won,lost)')

  const activeMatches = matches ?? []

  // 4. Find grants closing in next 7 days
  const today = new Date()
  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setUTCDate(today.getUTCDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const sevenDayStr = sevenDaysFromNow.toISOString().split('T')[0]

  const urgentGrants = activeMatches.filter((m) => {
    const grant = m.grant as unknown as { deadline?: string; name: string; funder: string; max_award?: number }
    if (!grant?.deadline) return false
    return grant.deadline >= todayStr && grant.deadline <= sevenDayStr
  })

  // 5. Fetch pipeline items
  const { data: pipelineItems } = await supabase
    .from('pipeline_items')
    .select('stage, grant:grants(name, max_award)')
    .eq('user_id', userId)

  const pipeline = pipelineItems ?? []
  const pipelineByStage = pipeline.reduce<Record<string, number>>((acc, item) => {
    const stage = item.stage as string
    acc[stage] = (acc[stage] ?? 0) + 1
    return acc
  }, {})

  // 6. Calculate metrics
  const totalPotential = activeMatches.reduce((sum, m) => {
    const grant = m.grant as { max_award?: number }
    return sum + (grant?.max_award ?? 0)
  }, 0)

  const activeApplications = activeMatches.filter(
    (m) => m.status === 'applying' || m.status === 'submitted' || m.status === 'researching'
  ).length

  // 7. Build Claude prompt
  const urgentGrantsText = urgentGrants.length > 0
    ? urgentGrants.map((m) => {
        const g = m.grant as unknown as { name: string; funder: string; deadline?: string; max_award?: number }
        return `- "${g.name}" by ${g.funder}: deadline ${g.deadline}, up to £${(g.max_award ?? 0).toLocaleString()}`
      }).join('\n')
    : 'None closing this week'

  const pipelineText = Object.entries(pipelineByStage).length > 0
    ? Object.entries(pipelineByStage)
        .map(([stage, count]) => `${stage}: ${count}`)
        .join(', ')
    : 'No active pipeline'

  const improvementsText = improvements.length > 0
    ? improvements.slice(0, 3).join('; ')
    : 'No specific improvements flagged'

  const systemPrompt = `You are a fundraising advisor for UK charities. Generate practical, actionable weekly plans. Be specific with real numbers and deadlines. Write in plain English. Be encouraging but direct. Always return valid JSON only, no markdown.`

  const userPrompt = `Generate a weekly action plan for ${org.name} (charity number: ${org.charity_number ?? 'not registered'}).

CURRENT SITUATION:
- Trust Score: ${trustScore}/100
- Active grant matches (not won/lost): ${activeMatches.length}
- Grants closing THIS WEEK (urgent): ${urgentGrants.length}
${urgentGrantsText}
- Pipeline summary: ${pipelineText}
- Total funding potential in pipeline: £${totalPotential.toLocaleString()}
- Trust score improvements needed: ${improvementsText}

Return a JSON object with exactly these keys:
{
  "urgent": [2-3 tasks that are time-sensitive, especially around grants closing this week],
  "important": [3-4 high-impact tasks to grow trust score and pipeline],
  "social_media": [exactly 3 social media post ideas relevant to their work and fundraising],
  "ai_recommendation": "one strategic insight or recommendation (2-3 sentences)"
}

Each task object must have:
- "title": string (short action title)
- "description": string (specific, actionable detail with real context from their situation)
- "estimated_minutes": number (realistic estimate)
- "link": string (optional relative path like "/pipeline", "/documents", "/grants", "/alerts" — only include if directly relevant)

Be specific. Reference actual grant names, deadlines, and amounts where known. Make social media posts feel authentic, not generic.`

  // 8. Call Claude API
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const aiData = await res.json() as {
    content?: Array<{ type: string; text: string }>
  }
  const rawText = aiData.content?.[0]?.text ?? ''

  // 9. Parse JSON response
  const claudePlan = parseClaudeJson(rawText)

  // 10. Return WeeklyPlan with metrics attached
  return {
    urgent: claudePlan.urgent ?? [],
    important: claudePlan.important ?? [],
    social_media: claudePlan.social_media ?? [],
    ai_recommendation: claudePlan.ai_recommendation ?? '',
    metrics: {
      trust_score: trustScore,
      active_applications: activeApplications,
      grants_closing_week: urgentGrants.length,
      total_potential: totalPotential,
    },
  }
}

export { getMondayOfWeek }
