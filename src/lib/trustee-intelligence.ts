/**
 * Trustee Intelligence
 *
 * Cross-charity trustee lookups using CC bulk data.
 * Detects trustees who appear across multiple charities,
 * and identifies potential conflicts of interest.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export interface TrusteeAppearance {
  trusteeName:        string
  registrationNumber: string
  charityName:        string
  isChair:            boolean
}

export interface TrusteeCrossover {
  trusteeName:   string
  isChair:       boolean
  otherCharities: {
    registrationNumber: string
    charityName:        string
    isChair:            boolean
  }[]
}

export interface ConflictResult {
  hasConflict:       boolean
  conflictingTrustees: {
    trusteeName:        string
    applicantCharity:   string
    funderCharity:      string
  }[]
}

// ── Cross-charity trustee lookup ─────────────────────────────────────────────

/**
 * For a given charity, find all trustees and check if any of them
 * also appear as trustees at other charities.
 */
export async function getTrusteeCrossovers(
  registrationNumber: string,
  supabase: SupabaseClient
): Promise<TrusteeCrossover[]> {

  // Get trustees for this charity
  const { data: trustees } = await supabase
    .from('cc_trustee')
    .select('trustee_name, is_chair')
    .eq('registration_number', registrationNumber)

  if (!trustees?.length) return []

  const results: TrusteeCrossover[] = []

  for (const trustee of trustees as { trustee_name: string; is_chair: boolean }[]) {
    // Find all OTHER charities this trustee appears in
    const { data: appearances } = await supabase
      .from('cc_trustee')
      .select('registration_number, is_chair, cc_charity_core!inner(charity_name)')
      .eq('trustee_name', trustee.trustee_name)
      .neq('registration_number', registrationNumber)
      .limit(20)

    if (appearances && appearances.length > 0) {
      results.push({
        trusteeName: trustee.trustee_name,
        isChair:     trustee.is_chair,
        otherCharities: appearances.map((a: {
          registration_number: string
          is_chair: boolean
          cc_charity_core: { charity_name: string }
        }) => ({
          registrationNumber: a.registration_number,
          charityName:        a.cc_charity_core?.charity_name ?? a.registration_number,
          isChair:            a.is_chair,
        })),
      })
    }
  }

  return results
}

// ── Conflict detection ────────────────────────────────────────────────────────

/**
 * Check if any trustee of the applicant charity is also a trustee
 * of any charity connected to the funder (by registration number).
 *
 * Useful when a funder entity is itself a registered charity.
 */
export async function detectTrusteeConflict(
  applicantRegNumber: string,
  funderRegNumbers: string[],
  supabase: SupabaseClient
): Promise<ConflictResult> {

  if (funderRegNumbers.length === 0) {
    return { hasConflict: false, conflictingTrustees: [] }
  }

  // Applicant trustees
  const { data: applicantTrustees } = await supabase
    .from('cc_trustee')
    .select('trustee_name')
    .eq('registration_number', applicantRegNumber)

  if (!applicantTrustees?.length) {
    return { hasConflict: false, conflictingTrustees: [] }
  }

  const applicantNames = applicantTrustees.map((t: { trustee_name: string }) => t.trustee_name)

  // Check funder trustee lists
  const { data: funderTrustees } = await supabase
    .from('cc_trustee')
    .select('trustee_name, registration_number, cc_charity_core!inner(charity_name)')
    .in('registration_number', funderRegNumbers)
    .in('trustee_name', applicantNames)

  if (!funderTrustees?.length) {
    return { hasConflict: false, conflictingTrustees: [] }
  }

  // Get applicant charity name
  const { data: applicantCore } = await supabase
    .from('cc_charity_core')
    .select('charity_name')
    .eq('registration_number', applicantRegNumber)
    .single()

  const conflictingTrustees = funderTrustees.map((ft: {
    trustee_name: string
    registration_number: string
    cc_charity_core: { charity_name: string }
  }) => ({
    trusteeName:      ft.trustee_name,
    applicantCharity: applicantCore?.charity_name ?? applicantRegNumber,
    funderCharity:    ft.cc_charity_core?.charity_name ?? ft.registration_number,
  }))

  return {
    hasConflict:         conflictingTrustees.length > 0,
    conflictingTrustees,
  }
}

// ── Network analysis ──────────────────────────────────────────────────────────

/**
 * Find the most connected trustees — those who appear across the most charities.
 * Useful for sector network mapping.
 */
export async function getMostConnectedTrustees(
  supabase: SupabaseClient,
  limit = 50
): Promise<{ trusteeName: string; charityCount: number }[]> {

  // Use a raw aggregation via Supabase RPC or manual grouping
  // Supabase doesn't have GROUP BY in the JS client, so we use an RPC or fetch all
  const { data } = await supabase.rpc('cc_trustee_connection_counts', { result_limit: limit })

  if (!data) {
    // Fallback: client-side aggregation on a sample
    const { data: sample } = await supabase
      .from('cc_trustee')
      .select('trustee_name')
      .limit(10000)

    if (!sample) return []

    const counts: Record<string, number> = {}
    for (const row of sample as { trustee_name: string }[]) {
      counts[row.trustee_name] = (counts[row.trustee_name] ?? 0) + 1
    }

    return Object.entries(counts)
      .filter(([, n]) => n > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([trusteeName, charityCount]) => ({ trusteeName, charityCount }))
  }

  return data
}

// ── Display helper ────────────────────────────────────────────────────────────

/**
 * Format crossover data for display in the UI.
 * Returns human-readable strings like:
 * "Sarah Johnson also serves as trustee at: Hackney Community Trust, London Food Bank"
 */
export function formatCrossovers(crossovers: TrusteeCrossover[]): string[] {
  return crossovers
    .filter(c => c.otherCharities.length > 0)
    .map(c => {
      const others = c.otherCharities
        .slice(0, 3)
        .map(o => o.charityName)
        .join(', ')
      const more = c.otherCharities.length > 3 ? ` and ${c.otherCharities.length - 3} more` : ''
      return `${c.trusteeName} also serves as trustee at: ${others}${more}`
    })
}
