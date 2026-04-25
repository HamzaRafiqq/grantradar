/**
 * Trust Score calculation — adapted to the real Supabase schema.
 *
 * Scoring categories (max 20 each = 100 total):
 *   Governance           — registered status, charity number, nonprofit type
 *   Financial            — annual income recorded and size
 *   Profile completeness — name, beneficiaries, projects, location, sector
 *   Track record         — pipeline activity, grant wins
 *   Application quality  — depth of description, AI match scores
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface TrustScores {
  governance:          number   // max 20
  financial:           number   // max 20
  documents:           number   // max 20  (profile completeness in our schema)
  trackRecord:         number   // max 20
  applicationQuality:  number   // max 20
}

export interface TrustScoreResult {
  total:        number
  scores:       TrustScores
  improvements: string[]
  grade:        'excellent' | 'good' | 'building' | 'starting'
  previous?:    number | null
}

export async function calculateTrustScore(
  orgId: string,
  supabase: SupabaseClient
): Promise<TrustScoreResult> {

  // ── Fetch data ────────────────────────────────────────────────────────────
  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (!org) throw new Error(`Organisation ${orgId} not found`)

  const { data: matchRows } = await supabase
    .from('grant_matches')
    .select('status, eligibility_score, notes, amount_requested')
    .eq('user_id', org.user_id)

  // Previous score (for delta in emails)
  const { data: prevHistory } = await supabase
    .from('trust_score_history')
    .select('total_score')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const matches: { status: string; eligibility_score: number; notes: string | null; amount_requested: number | null }[] = matchRows ?? []

  // ── Score buckets ─────────────────────────────────────────────────────────
  const scores: TrustScores = {
    governance:         0,
    financial:          0,
    documents:          0,
    trackRecord:        0,
    applicationQuality: 0,
  }

  // ── GOVERNANCE (max 20) ───────────────────────────────────────────────────
  if (org.registered_charity)                            scores.governance += 8
  if (org.charity_number?.trim())                        scores.governance += 4
  if (org.nonprofit_type &&
      org.nonprofit_type !== 'Other' &&
      org.nonprofit_type !== 'Community Group')          scores.governance += 4
  if (org.location?.trim())                             scores.governance += 4

  // ── FINANCIAL (max 20) ────────────────────────────────────────────────────
  if (org.annual_income) {
    scores.financial += 5  // base: income is recorded
    if (org.annual_income === 'under_100k')  scores.financial += 5   // total 10
    if (org.annual_income === '100k_500k')   scores.financial += 10  // total 15
    if (org.annual_income === 'over_500k')   scores.financial += 15  // total 20
  }
  scores.financial = Math.min(scores.financial, 20)

  // ── PROFILE COMPLETENESS / DOCUMENTS (max 20) ─────────────────────────────
  if ((org.name?.trim().length ?? 0) > 5)                         scores.documents += 4
  if ((org.beneficiaries?.trim().length ?? 0) > 30)               scores.documents += 4
  if ((org.current_projects?.trim().length ?? 0) > 30)            scores.documents += 4
  if ((org.location?.trim().length ?? 0) > 2)                     scores.documents += 4
  if (org.sector && org.sector !== 'other')                       scores.documents += 4

  // ── TRACK RECORD (max 20) ─────────────────────────────────────────────────
  const wonApps     = matches.filter(m => m.status === 'won')
  const activeApps  = matches.filter(m => !['new'].includes(m.status))

  if (matches.length > 0)      scores.trackRecord += 5
  if (wonApps.length >= 1)     scores.trackRecord += 5
  if (wonApps.length >= 3)     scores.trackRecord += 5
  if (activeApps.length >= 5)  scores.trackRecord += 5

  // ── APPLICATION QUALITY (max 20) ─────────────────────────────────────────
  if ((org.beneficiaries?.trim().length ?? 0) > 100)  scores.applicationQuality += 5
  if ((org.current_projects?.trim().length ?? 0) > 100) scores.applicationQuality += 5

  const avgScore = matches.length > 0
    ? matches.reduce((s, m) => s + (m.eligibility_score ?? 0), 0) / matches.length
    : 0
  if (avgScore >= 5) scores.applicationQuality += 5
  if (avgScore >= 7) scores.applicationQuality += 5

  // ── Total ─────────────────────────────────────────────────────────────────
  const total = Math.min(100,
    scores.governance + scores.financial + scores.documents +
    scores.trackRecord + scores.applicationQuality
  )

  // ── Improvement tips ──────────────────────────────────────────────────────
  const improvements: string[] = []

  if (!org.charity_number?.trim())
    improvements.push('Add your charity registration number to boost your governance score by 4 points')
  if (scores.financial < 15 && org.annual_income === 'under_100k')
    improvements.push('Your profile shows under £100k income — update it if your income has grown to improve your score')
  if ((org.beneficiaries?.trim().length ?? 0) < 100)
    improvements.push('Write a detailed beneficiary description (100+ words) to improve your profile and application quality scores')
  if ((org.current_projects?.trim().length ?? 0) < 100)
    improvements.push('Add detailed current projects (100+ words) to show funders your active work')
  if (wonApps.length === 0)
    improvements.push('Log your previous grant wins in the Pipeline to build your track record score')
  if (scores.governance < 16 && !org.nonprofit_type)
    improvements.push('Set your organisation type in settings to improve your governance score')
  if (activeApps.length < 5)
    improvements.push('Track more grant applications in your Pipeline to build a stronger track record')

  // ── Persist ───────────────────────────────────────────────────────────────
  await supabase.from('trust_score_history').insert({
    org_id:              orgId,
    total_score:         total,
    governance_score:    scores.governance,
    financial_score:     scores.financial,
    document_score:      scores.documents,
    track_record_score:  scores.trackRecord,
    application_score:   scores.applicationQuality,
    improvements:        improvements.slice(0, 3),
  })

  await supabase
    .from('organisations')
    .update({ trust_score: total })
    .eq('id', orgId)

  const grade: TrustScoreResult['grade'] =
    total >= 80 ? 'excellent' :
    total >= 50 ? 'good' :
    total >= 25 ? 'building' : 'starting'

  return {
    total,
    scores,
    improvements: improvements.slice(0, 3),
    grade,
    previous: prevHistory?.total_score ?? null,
  }
}

/** Human-readable label for each score category */
export const CATEGORY_LABELS: Record<keyof TrustScores, string> = {
  governance:         'Governance',
  financial:          'Financial',
  documents:          'Profile',
  trackRecord:        'Track Record',
  applicationQuality: 'Application Quality',
}

/** Colour for a total score */
export function trustScoreColor(score: number): { text: string; ring: string; bg: string } {
  if (score >= 80) return { text: 'text-green-600',  ring: '#16A34A', bg: 'bg-green-50'  }
  if (score >= 50) return { text: 'text-amber-600',  ring: '#D97706', bg: 'bg-amber-50'  }
  return              { text: 'text-red-600',    ring: '#DC2626', bg: 'bg-red-50'    }
}
