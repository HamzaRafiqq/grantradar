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

  // Documents in vault (real data now)
  const { data: docRows } = await supabase
    .from('documents')
    .select('category')
    .eq('org_id', orgId)

  // Previous score (for delta in emails)
  const { data: prevHistory } = await supabase
    .from('trust_score_history')
    .select('total_score')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const matches: { status: string; eligibility_score: number; notes: string | null; amount_requested: number | null }[] = matchRows ?? []
  const docCategories = new Set<string>((docRows ?? []).map((d: { category: string }) => d.category))
  const docCount = docRows?.length ?? 0

  // ── Score buckets ─────────────────────────────────────────────────────────
  const scores: TrustScores = {
    governance:         0,
    financial:          0,
    documents:          0,
    trackRecord:        0,
    applicationQuality: 0,
  }

  // ── CC DATA (enriches governance + financial if available) ───────────────────
  let ccCore: {
    date_of_registration?: string
    charity_gift_aid?: boolean
  } | null = null
  let ccFinancials: { income_total?: number; expenditure_total?: number; net_income?: number }[] = []
  let ccTrusteeCount = 0
  let ccReturns: { accounts_received?: boolean; accounts_type?: string; date_return_received?: string; date_return_required?: string }[] = []
  let ccEvents: { event_type?: string }[] = []

  if (org.charity_number?.trim()) {
    const num = org.charity_number.trim().replace(/\D/g, '')
    const [
      { data: coreRow },
      { data: finRows },
      { data: trusteeRows },
      { data: returnRows },
      { data: eventRows },
    ] = await Promise.all([
      supabase.from('cc_charity_core').select('date_of_registration, charity_gift_aid').eq('registration_number', num).maybeSingle(),
      supabase.from('cc_financial_history').select('income_total, expenditure_total, net_income').eq('registration_number', num).order('period_end_date', { ascending: false }).limit(10),
      supabase.from('cc_trustee').select('trustee_name', { count: 'exact' }).eq('registration_number', num).limit(1),
      supabase.from('cc_annual_return').select('accounts_received, accounts_type, date_return_received, date_return_required').eq('registration_number', num).limit(20),
      supabase.from('cc_event').select('event_type').eq('registration_number', num),
    ])
    ccCore        = coreRow
    ccFinancials  = (finRows ?? []) as typeof ccFinancials
    ccTrusteeCount = trusteeRows?.length ?? 0  // approximate from returned rows
    ccReturns     = (returnRows ?? []) as typeof ccReturns
    ccEvents      = (eventRows ?? []) as typeof ccEvents
  }

  const ccYearsOperating = ccCore?.date_of_registration
    ? Math.floor((Date.now() - new Date(ccCore.date_of_registration).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const ccFiledOnTime = ccReturns.filter(r =>
    r.accounts_received && r.date_return_received && r.date_return_required &&
    new Date(r.date_return_received) <= new Date(r.date_return_required)
  ).length
  const ccRequiredReturns = ccReturns.filter(r => r.accounts_received !== null).length
  const ccAllOnTime = ccRequiredReturns > 0 && ccFiledOnTime === ccRequiredReturns
  const ccHasAudit  = ccReturns.some(r => r.accounts_type?.toLowerCase().includes('audit'))
  const ccHasRemovalEvent = ccEvents.some(e => e.event_type?.toLowerCase().includes('remov'))

  const latestCCYear = ccFinancials[0]
  const ccLatestSurplus  = latestCCYear && Number(latestCCYear.net_income ?? 0) >= 0
  const cc5yrFinancials  = ccFinancials.slice(0, 5)
  const ccDeficitYears   = cc5yrFinancials.filter(y => Number(y.net_income ?? 0) < 0).length
  const ccFirstIncome    = ccFinancials[ccFinancials.length - 1]?.income_total ?? 0
  const ccLastIncome     = ccFinancials[0]?.income_total ?? 0
  const cc5yrGrowth      = ccFirstIncome > 0 ? ((Number(ccLastIncome) - Number(ccFirstIncome)) / Number(ccFirstIncome)) * 100 : null
  const latestExpenditure = Number(latestCCYear?.expenditure_total ?? 0)
  const latestFunds       = 0 // not fetched here — available in full profile API
  const ccMonthsReserves  = latestFunds > 0 && latestExpenditure > 0
    ? latestFunds / (latestExpenditure / 12)
    : null

  // ── GOVERNANCE (max 20) ───────────────────────────────────────────────────
  // Base FundsRadar profile signals
  if (org.registered_charity)           scores.governance += 4
  if (org.charity_number?.trim())       scores.governance += 2
  if (org.nonprofit_type && org.nonprofit_type !== 'Other') scores.governance += 2
  if (org.location?.trim())            scores.governance += 2

  // CC-derived governance signals (max 10 extra → capped at 20 total)
  if (ccTrusteeCount >= 3)             scores.governance += 2  // proper board size
  if (ccTrusteeCount >= 6)             scores.governance += 2  // good board size
  if (ccAllOnTime)                     scores.governance += 4  // all returns on time
  if (ccHasAudit)                      scores.governance += 3  // statutory audit
  if (!ccHasRemovalEvent)              scores.governance += 2  // no removal events
  if (ccYearsOperating !== null && ccYearsOperating >= 5) scores.governance += 3  // 5+ years
  scores.governance = Math.min(scores.governance, 20)

  // ── FINANCIAL (max 20) ────────────────────────────────────────────────────
  // Base from profile income bracket
  if (org.annual_income) {
    scores.financial += 2  // base: income is recorded
    if (org.annual_income === 'under_100k')  scores.financial += 2
    if (org.annual_income === '100k_500k')   scores.financial += 5
    if (org.annual_income === 'over_500k')   scores.financial += 8
  }

  // CC financial data (max 12 extra → capped at 20)
  if (ccLatestSurplus)                          scores.financial += 5  // latest year surplus
  if (cc5yrGrowth !== null && cc5yrGrowth >= 0) scores.financial += 5  // growing
  if (ccMonthsReserves !== null && ccMonthsReserves >= 3) scores.financial += 5  // 3+ months reserves
  if (ccDeficitYears <= 1)                      scores.financial += 5  // fewer than 2 deficits in 5yr
  scores.financial = Math.min(scores.financial, 20)

  // ── DOCUMENT VAULT (max 20) ───────────────────────────────────────────────
  // FundsRadar vault documents
  if (docCategories.has('Legal'))      scores.documents += 3
  if (docCategories.has('Financial'))  scores.documents += 3
  if (docCategories.has('Governance')) scores.documents += 3
  if (docCategories.has('Policies'))   scores.documents += 3
  if (docCategories.has('HR'))         scores.documents += 3

  // CC-derived document signals
  if (ccReturns.some(r => r.accounts_received === true))  scores.documents += 4  // accounts received by CC
  if (ccHasAudit)                                          scores.documents += 2  // statutory audit on record
  scores.documents = Math.min(scores.documents, 20)

  // ── TRACK RECORD (max 20) ─────────────────────────────────────────────────
  const wonApps     = matches.filter(m => m.status === 'won')
  const activeApps  = matches.filter(m => !['new'].includes(m.status))

  // FundsRadar pipeline activity
  if (matches.length > 0)      scores.trackRecord += 3
  if (wonApps.length >= 1)     scores.trackRecord += 3
  if (wonApps.length >= 3)     scores.trackRecord += 3
  if (activeApps.length >= 5)  scores.trackRecord += 3

  // CC-derived track record signals
  if (!ccHasRemovalEvent)                                               scores.trackRecord += 3  // never removed from register
  if (ccYearsOperating !== null && ccYearsOperating >= 10)              scores.trackRecord += 3  // 10+ years operating
  if (ccAllOnTime && ccRequiredReturns >= 3)                            scores.trackRecord += 2  // consistent filing
  scores.trackRecord = Math.min(scores.trackRecord, 20)

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
  if (!docCategories.has('Legal'))
    improvements.push('Upload legal documents (e.g. constitution, governing document) to your Document Vault — worth 4 points')
  if (!docCategories.has('Financial'))
    improvements.push('Upload financial documents (e.g. latest accounts) to your Document Vault — worth 4 points')
  if (!docCategories.has('Governance'))
    improvements.push('Upload governance documents (e.g. trustee list, board minutes) to your Document Vault — worth 4 points')
  if (!docCategories.has('Policies'))
    improvements.push('Upload your key policies (e.g. safeguarding, EDI) to your Document Vault — worth 4 points')
  if (docCount === 0)
    improvements.push('Your Document Vault is empty — uploading documents can add up to 20 points to your Trust Score')
  if ((org.beneficiaries?.trim().length ?? 0) < 100)
    improvements.push('Write a detailed beneficiary description (100+ words) to improve your application quality score')
  if ((org.current_projects?.trim().length ?? 0) < 100)
    improvements.push('Add detailed current projects (100+ words) to show funders your active work')
  if (wonApps.length === 0)
    improvements.push('Log your previous grant wins in the Pipeline to build your track record score')
  if (scores.governance < 16 && !org.nonprofit_type)
    improvements.push('Set your organisation type in settings to improve your governance score')
  if (activeApps.length < 5)
    improvements.push('Track more grant applications in your Pipeline to build a stronger track record')

  // CC-derived improvement tips
  if (ccCore && !ccAllOnTime && ccRequiredReturns > 0)
    improvements.push('Some annual returns were filed late — consistent on-time filing boosts your governance score significantly')
  if (ccCore && ccTrusteeCount < 3)
    improvements.push('The Charity Commission shows fewer than 3 trustees — a full board of at least 6 demonstrates strong governance')
  if (ccCore && !ccLatestSurplus)
    improvements.push('Your latest CC financial data shows a deficit year — demonstrating a recovery plan can reassure funders')
  if (ccCore && cc5yrGrowth !== null && cc5yrGrowth < 0)
    improvements.push('Your CC financial data shows a declining income trend — diversifying income sources can improve your financial score')

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
