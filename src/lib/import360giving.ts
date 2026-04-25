/**
 * 360Giving data import — shared logic used by both:
 *   - scripts/import-360giving.ts  (local CLI run)
 *   - src/app/api/cron/import-grants/route.ts  (Vercel cron)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx')

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImportResult {
  publisher: string
  added: number
  updated: number
  skipped: number
  error?: string
}

export interface ImportSummary {
  results: ImportResult[]
  totalAdded: number
  totalUpdated: number
  totalSkipped: number
  publishersProcessed: number
  durationMs: number
}

interface GrantRow {
  name: string
  funder: string
  description: string
  eligibility_criteria: string
  min_award: number
  max_award: number
  deadline: string | null
  application_url: string
  sectors: string[]
  locations: string[]
  income_requirements: string
  is_active: boolean
  country: string
  currency: string
  source: string
  public_title: string
  public_description: string
  funder_type: string
}

// ── Registry ──────────────────────────────────────────────────────────────────

interface RegistryDistribution {
  downloadURL: string
  accessURL?: string
  title?: string
}

interface RegistryPublisher {
  name: string
  website?: string
  prefix?: string
  last_published?: string
  org_id?: string
}

interface RegistryEntry {
  title: string
  identifier: string
  modified?: string
  publisher: RegistryPublisher
  distribution: RegistryDistribution[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return file extension from URL, ignoring query strings */
function urlExt(url: string): string {
  return url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
}

/** Parse ISO date string, return null if invalid or unparseable */
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Accept YYYY-MM-DD (or ISO datetime)
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Infer sectors from combined grant text */
function inferSectors(text: string): string[] {
  const t = text.toLowerCase()
  const sectors = new Set<string>()
  if (/child|young people|youth|school|pupil/.test(t))            sectors.add('children')
  if (/educat|training|skill|learn|apprentice|college/.test(t))   sectors.add('education')
  if (/health|wellbeing|mental health|medical|counsell|nhs/.test(t)) sectors.add('health')
  if (/homeless|housing|shelter|refuge/.test(t))                  sectors.add('homelessness')
  if (/environment|climate|green|nature|wildlife|conservation|ecology/.test(t)) sectors.add('environment')
  if (/art|cultur|museum|music|theatre|film|heritage|creative/.test(t)) sectors.add('arts')
  if (/disabilit|accessib|deaf|blind|autism/.test(t))             sectors.add('disability')
  if (/elder|older people|ageing|aging|senior|dementia/.test(t))  sectors.add('elderly')
  if (/animal|wildlife|veterinar/.test(t))                        sectors.add('animals')
  return sectors.size > 0 ? [...sectors] : ['other']
}

/** Infer funder type from funder name */
function inferFunderType(name: string): string {
  const n = name.toLowerCase()
  if (/national lottery|nlhf|arts council|sport england|big lottery/.test(n)) return 'Lottery'
  if (/council|government|borough|county|district|ministry|department/.test(n)) return 'Government'
  if (/foundation/.test(n)) return 'Foundation'
  if (/trust/.test(n)) return 'Trust'
  if (/plc|ltd|limited|bank|insurance|corporate/.test(n)) return 'Corporate'
  return 'Trust'
}

/** Build anonymised title for free-tier users */
function makePublicTitle(funderName: string): string {
  const n = funderName.toLowerCase()
  if (/national lottery|nlhf|arts council|sport england/.test(n)) return 'Lottery Fund Grant'
  if (/council|government|borough|county|district/.test(n))       return 'Government Grant'
  if (/foundation/.test(n))                                        return 'Foundation Grant'
  if (/trust/.test(n))                                             return 'Independent Trust Grant'
  if (/community/.test(n))                                         return 'Community Fund Grant'
  return 'UK Charity Grant'
}

/** Build anonymised description for free-tier users */
function makePublicDescription(description: string, funderName: string): string {
  if (!description.trim()) {
    return 'Grant funding available from a UK funder. Upgrade to Pro to see the funder name, full eligibility details, and apply directly.'
  }
  // Replace all occurrences of the funder name (case-insensitive)
  const escaped = funderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const anon = description.replace(new RegExp(escaped, 'gi'), 'this funder').slice(0, 400)
  return anon + (description.length > 400 ? '… Upgrade to read more.' : '')
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim()); current = ''
    } else {
      current += ch
    }
  }
  values.push(current.trim())
  return values
}

function parseCSV(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, '') // strip BOM
  const lines = cleaned.split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVRow(lines[0])
  const records: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVRow(lines[i])
    const rec: Record<string, string> = {}
    headers.forEach((h, idx) => { rec[h.trim()] = (values[idx] ?? '').trim() })
    records.push(rec)
  }
  return records
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowFromCSV(row: Record<string, string>, publisherName: string): GrantRow | null {
  const identifier = row['Identifier']?.trim()
  const title      = (row['Title'] || row['Grant Programme:Title'] || '').trim()
  const funder     = (row['Funding Org:Name'] || publisherName).trim()
  const amountRaw  = parseFloat(row['Amount Awarded'] || '0')
  const amount     = isNaN(amountRaw) ? 0 : Math.round(amountRaw)
  const currency   = (row['Currency'] || 'GBP').trim().toUpperCase()
  const deadlineRaw = parseDate(row['Planned Dates:End Date'])
  const description = (row['Description'] || '').trim()
  const programme   = (row['Grant Programme:Title'] || '').trim()
  const location    = (row['Beneficiary Location:Name'] || '').trim() || 'United Kingdom'

  if (!identifier || !title || !funder) return null

  // Enrich title with programme if different
  const fullTitle = programme && programme !== title
    ? `${programme}`
    : title

  // Only keep future deadlines; past project ends become null
  const today = new Date().toISOString().split('T')[0]
  const deadline = deadlineRaw && deadlineRaw >= today ? deadlineRaw : null

  const text = `${fullTitle} ${description}`

  return {
    name: fullTitle.slice(0, 255),
    funder: funder.slice(0, 255),
    description: description.slice(0, 800),
    eligibility_criteria: 'UK registered charity or voluntary organisation. Visit the funder website for specific eligibility requirements and current open rounds.',
    min_award: 0,
    max_award: amount,
    deadline,
    application_url: `https://grantnav.threesixtygiving.org/grant/${identifier}`,
    sectors: inferSectors(text),
    locations: [location],
    income_requirements: 'any size',
    is_active: true,
    country: 'United Kingdom',
    currency,
    source: '360giving',
    public_title: makePublicTitle(funder),
    public_description: makePublicDescription(description, funder),
    funder_type: inferFunderType(funder),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowFromJSON(g: any, publisherName: string): GrantRow | null {
  const identifier = (g.id || '').trim()
  const title      = (g.title || '').trim()
  const fundingOrg = Array.isArray(g.fundingOrganization) ? g.fundingOrganization[0] : null
  const funder     = (fundingOrg?.name || publisherName).trim()
  const amount     = g.amountAwarded ? Math.round(g.amountAwarded) : 0
  const currency   = (g.currency || 'GBP').toUpperCase()
  const planned    = Array.isArray(g.plannedDates) ? g.plannedDates[0] : null
  const deadlineRaw = parseDate(planned?.endDate)
  const description = (g.description || '').trim()
  const programme   = Array.isArray(g.grantProgramme) ? (g.grantProgramme[0]?.title || '').trim() : ''
  const locArr      = Array.isArray(g.beneficiaryLocation) ? g.beneficiaryLocation : []
  const location    = (locArr[0]?.name || 'United Kingdom').trim()

  if (!identifier || !title || !funder) return null

  const fullTitle = programme && programme !== title ? programme : title
  const today = new Date().toISOString().split('T')[0]
  const deadline = deadlineRaw && deadlineRaw >= today ? deadlineRaw : null
  const text = `${fullTitle} ${description}`

  return {
    name: fullTitle.slice(0, 255),
    funder: funder.slice(0, 255),
    description: description.slice(0, 800),
    eligibility_criteria: 'UK registered charity or voluntary organisation. Visit the funder website for specific eligibility requirements and current open rounds.',
    min_award: 0,
    max_award: amount,
    deadline,
    application_url: `https://grantnav.threesixtygiving.org/grant/${identifier}`,
    sectors: inferSectors(text),
    locations: [location],
    income_requirements: 'any size',
    is_active: true,
    country: 'United Kingdom',
    currency,
    source: '360giving',
    public_title: makePublicTitle(funder),
    public_description: makePublicDescription(description, funder),
    funder_type: inferFunderType(funder),
  }
}

// ── XLSX parser ───────────────────────────────────────────────────────────────

function parseXLSX(buffer: ArrayBuffer, publisherName: string): GrantRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const rows: GrantRow[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const records: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    if (records.length === 0) continue
    // Only process sheets that look like 360Giving grant data
    const firstRow = records[0]
    if (!firstRow['Identifier'] && !firstRow['Title'] && !firstRow['Funding Org:Name']) continue
    for (const rec of records) {
      // Coerce all values to strings
      const strRec: Record<string, string> = {}
      for (const [k, v] of Object.entries(firstRow)) {
        strRec[k] = String((rec as Record<string, unknown>)[k] ?? '')
      }
      const row = rowFromCSV(strRec, publisherName)
      if (row) rows.push(row)
    }
  }
  return rows
}

// ── Fetch + parse one dataset ─────────────────────────────────────────────────

async function fetchAndParse(url: string, publisherName: string): Promise<GrantRow[]> {
  const ext = urlExt(url)
  const res = await fetch(url, {
    signal: AbortSignal.timeout(45_000),
    headers: { 'User-Agent': 'FundsRadar/1.0 (hello@fundsradar.co)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  if (ext === 'csv') {
    const text = await res.text()
    const rows = parseCSV(text)
    return rows.map(r => rowFromCSV(r, publisherName)).filter((r): r is GrantRow => r !== null)
  }

  if (ext === 'json') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await res.json()
    // 360Giving JSON package: { grants: [...] } or plain array
    const grants = Array.isArray(raw) ? raw : (raw.grants ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: (GrantRow | null)[] = grants.map((g: any) => rowFromJSON(g, publisherName))
    return mapped.filter((row): row is GrantRow => row !== null)
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await res.arrayBuffer()
    return parseXLSX(buffer, publisherName)
  }

  throw new Error(`Unsupported format: ${ext}`)
}

// ── Upsert batch ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatch(supabase: any, rows: GrantRow[]): Promise<{ added: number; updated: number }> {
  if (rows.length === 0) return { added: 0, updated: 0 }

  // Check which application_urls already exist
  const urls = rows.map(r => r.application_url)
  const { data: existing } = await supabase
    .from('grants')
    .select('application_url')
    .in('application_url', urls)

  const existingUrls = new Set((existing ?? []).map((e: { application_url: string }) => e.application_url))
  const added   = rows.filter(r => !existingUrls.has(r.application_url)).length
  const updated = rows.filter(r =>  existingUrls.has(r.application_url)).length

  await supabase
    .from('grants')
    .upsert(rows, { onConflict: 'application_url', ignoreDuplicates: false })

  return { added, updated }
}

// ── Main import function ──────────────────────────────────────────────────────

export interface ImportOptions {
  /** Maximum number of publishers to process (default: all) */
  maxPublishers?: number
  /** Only process publishers updated since this date (YYYY-MM-DD) */
  since?: string
  /** Verbose logging */
  verbose?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runImport(supabase: any, opts: ImportOptions = {}): Promise<ImportSummary> {
  const { maxPublishers = 999, since, verbose = false } = opts
  const log = verbose ? console.log : () => {}
  const startMs = Date.now()

  // 1. Fetch registry
  const regRes = await fetch('https://registry.threesixtygiving.org/data.json', {
    signal: AbortSignal.timeout(15_000),
  })
  if (!regRes.ok) throw new Error(`Registry fetch failed: ${regRes.status}`)
  const registry: RegistryEntry[] = await regRes.json()

  // 2. Build list of parseable datasets (CSV + JSON only)
  interface DatasetJob {
    publisherName: string
    url: string
    lastPublished: string
  }

  const jobs: DatasetJob[] = []
  for (const entry of registry) {
    const pubName = entry.publisher?.name || entry.title || 'Unknown'
    const lastPub = entry.publisher?.last_published || entry.modified || ''
    if (since && lastPub < since) continue
    for (const dist of entry.distribution ?? []) {
      const ext = urlExt(dist.downloadURL)
      if (ext === 'csv' || ext === 'json' || ext === 'xlsx' || ext === 'xls') {
        jobs.push({ publisherName: pubName, url: dist.downloadURL, lastPublished: lastPub })
      }
    }
  }

  // Sort newest first, then cap
  jobs.sort((a, b) => b.lastPublished.localeCompare(a.lastPublished))
  const limited = jobs.slice(0, maxPublishers)

  log(`Registry: ${registry.length} publishers, ${jobs.length} CSV/JSON datasets, processing ${limited.length}`)

  // 3. Process each dataset
  const results: ImportResult[] = []
  let totalAdded = 0, totalUpdated = 0, totalSkipped = 0

  const BATCH = 100
  for (const job of limited) {
    const result: ImportResult = { publisher: job.publisherName, added: 0, updated: 0, skipped: 0 }
    try {
      log(`  ↓ ${job.publisherName} — ${job.url.slice(0, 60)}`)
      const rows = await fetchAndParse(job.url, job.publisherName)

      if (rows.length === 0) { result.skipped = 0; results.push(result); continue }

      // Upsert in batches of 100
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH)
        const { added, updated } = await upsertBatch(supabase, batch)
        result.added   += added
        result.updated += updated
      }

      log(`    ✓ ${result.added} added, ${result.updated} updated from ${rows.length} records`)
    } catch (err) {
      result.error = String(err)
      log(`    ✗ Error: ${result.error}`)
    }
    results.push(result)
    totalAdded   += result.added
    totalUpdated += result.updated
    totalSkipped += result.skipped

    // Small delay to avoid hammering servers
    await new Promise(r => setTimeout(r, 150))
  }

  return {
    results,
    totalAdded,
    totalUpdated,
    totalSkipped,
    publishersProcessed: limited.length,
    durationMs: Date.now() - startMs,
  }
}
