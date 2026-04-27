#!/usr/bin/env node
// @ts-nocheck — Supabase untyped DB, this is a CLI tool not app code
/**
 * Charity Commission Bulk Data Import
 *
 * Downloads all 10 CC data extracts, parses TSV, upserts into Supabase.
 *
 * Usage:
 *   npm run import:cc                      # import all files
 *   npm run import:cc -- --file=core       # import only core charity file
 *   npm run import:cc -- --file=financial  # import only financial history
 *   npm run import:cc -- --dry-run         # parse only, don't write to DB
 *
 * Prerequisites:
 *   npm install adm-zip
 */

import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir }  from 'os'
import { createClient } from '@supabase/supabase-js'
import AdmZip from 'adm-zip'

// ── Env loader ────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const lines   = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim()
      if (key && !process.env[key]) process.env[key] = val
    }
  } catch { /* no .env.local */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = 'https://ccewuksprdoneregsadata1.blob.core.windows.net/data/txt/'

function parseDate(s: string): string | null {
  if (!s?.trim()) return null
  const t = s.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t).toISOString()
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(t)) {
    const [d, m, y] = t.split('/')
    return new Date(`${y}-${m}-${d}`).toISOString()
  }
  return null
}

function parseBigInt(s: string): number | null {
  if (!s?.trim() || s.trim() === '0') return null
  const n = parseInt(s.replace(/[^0-9-]/g, ''), 10)
  return isNaN(n) ? null : n
}

function parseBool(s: string): boolean | null {
  if (!s?.trim()) return null
  return s.trim().toUpperCase() === 'TRUE' || s.trim() === '1'
}

// Strip UTF-8 BOM if present
function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s
}

// Download a URL to a buffer
async function downloadToBuffer(url: string): Promise<Buffer> {
  console.log(`  ↓ Downloading ${url.split('/').pop()}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

// Download ZIP, extract the first .txt file inside, return content
async function downloadAndExtract(filename: string): Promise<string> {
  const url    = BASE + filename
  const buf    = await downloadToBuffer(url)
  const zip    = new AdmZip(buf)
  const entry  = zip.getEntries().find(e => e.entryName.endsWith('.txt') || e.entryName.endsWith('.csv'))
  if (!entry) throw new Error(`No .txt file found inside ${filename}`)
  const raw = zip.readAsText(entry)
  return stripBOM(raw)
}

// Parse TSV into array of row objects
function parseTSV(content: string): Record<string, string>[] {
  const lines = content.split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split('\t').map(h => h.trim().replace(/\r$/, '').toLowerCase())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '')
    if (!line.trim()) continue
    const cols = line.split('\t')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim() })
    rows.push(row)
  }
  return rows
}

// Process in batches and upsert
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchUpsert(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: object[],
  conflictColumn: string,
  dryRun: boolean,
  label: string
): Promise<number> {
  const BATCH = 500

  // Deduplicate entire dataset by the FULL conflict key before batching
  // (CC data can contain duplicate rows — use all conflict columns as the key)
  const keyFields = conflictColumn.split(',').map(k => k.trim())
  const seen = new Map<string, object>()
  for (const row of rows) {
    const key = keyFields
      .map(k => (row as Record<string, string>)[k] ?? '')
      .join('||')
    seen.set(key, row) // last one wins
  }
  const deduped = Array.from(seen.values())

  let total = 0
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH)
    if (!dryRun) {
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false })
      if (error) {
        console.error(`  ⚠️  Upsert error at row ${i} in ${table}: ${error.message}`)
      }
    }
    total += batch.length
    if ((i + BATCH) % 5000 === 0 || i + BATCH >= deduped.length) {
      console.log(`  ${label}: ${total.toLocaleString()} / ${deduped.length.toLocaleString()} rows processed`)
    }
  }
  return total
}

// ── File processors ───────────────────────────────────────────────────────────

async function importCore(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [1/9] Core charity register...')
  const content = await downloadAndExtract('publicextract.charity.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} charities`)

  const mapped = rows.map(r => ({
    registration_number:     r['registered_charity_number'],
    linked_charity_number:   r['linked_charity_number']             || null,
    charity_name:            r['charity_name']                      || 'Unknown',
    charity_type:            r['charity_type']                      || null,
    registration_status:     r['charity_registration_status']       || 'Registered',
    date_of_registration:    parseDate(r['date_of_registration']),
    date_of_removal:         parseDate(r['date_of_removal']),
    reporting_status:        r['charity_reporting_status']          || null,
    latest_fin_period_start: parseDate(r['latest_acc_fin_period_start_date']),
    latest_fin_period_end:   parseDate(r['latest_acc_fin_period_end_date']),
    contact_address1:        r['charity_contact_address1']          || null,
    contact_address2:        r['charity_contact_address2']          || null,
    contact_address3:        r['charity_contact_address3']          || null,
    contact_address4:        r['charity_contact_address4']          || null,
    contact_address5:        r['charity_contact_address5']          || null,
    contact_postcode:        r['charity_contact_postcode']          || null,
    contact_phone:           r['charity_contact_phone']             || null,
    contact_email:           r['charity_contact_email']             || null,
    contact_web:             r['charity_contact_web']               || null,
    charity_activities:      r['charity_activities']                || null,
    charity_gift_aid:        parseBool(r['charity_gift_aid']),
    charity_has_land:        parseBool(r['charity_has_land']),
    updated_at:              new Date().toISOString(),
  })).filter(r => r.registration_number)

  return batchUpsert(supabase, 'cc_charity_core', mapped, 'registration_number', dryRun, 'Core')
}

async function importFinancialHistory(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [2/9] Financial history...')
  const content = await downloadAndExtract('publicextract.charity_annual_return_history.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} financial records`)

  // Log actual column headers so we can verify mappings
  if (rows.length > 0) {
    const cols = Object.keys(rows[0])
    console.log(`  Columns (${cols.length}): ${cols.join(', ')}`)
  }

  // Actual CC annual return history columns (confirmed from file inspect):
  //   organisation_number, date_of_extract, registered_charity_number,
  //   fin_period_start_date, fin_period_end_date, ar_cycle_reference,
  //   reporting_due_date, date_annual_return_received, date_accounts_received,
  //   total_gross_income, total_gross_expenditure,
  //   accounts_qualified, suppression_ind, suppression_type

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['fin_period_end_date'])
    .map(r => {
      const income      = parseBigInt(r['total_gross_income'])
      const expenditure = parseBigInt(r['total_gross_expenditure'])
      // net_income not in file — compute from income minus expenditure
      const netIncome   = (income != null && expenditure != null)
        ? income - expenditure
        : null

      return {
        registration_number:          r['registered_charity_number'],
        period_end_date:              parseDate(r['fin_period_end_date']),
        period_start_date:            parseDate(r['fin_period_start_date']),
        // ar_cycle_reference like "AR21" — extract numeric part for period_order
        period_order:                 parseInt((r['ar_cycle_reference'] || '').replace(/\D/g, '') || '0', 10) || 1,
        // Income breakdown not available in history file
        income_donations_legacies:    null,
        income_charitable_activities: null,
        income_other_trading:         null,
        income_investments:           null,
        income_other:                 null,
        income_total:                 income,
        expenditure_raising_funds:    null,
        expenditure_charitable:       null,
        expenditure_other:            null,
        expenditure_total:            expenditure,
        net_income:                   netIncome,
        // total_funds not available in history file
        total_funds_end_period:       null,
        account_type:                 null,
      }
    })
    .filter(r => r.period_end_date)

  // Spot-check Oxfam (202918) to verify mappings
  const oxfam = mapped.find(r => r.registration_number === '202918')
  if (oxfam) {
    console.log(`  ✅ Oxfam check: income=${oxfam.income_total?.toLocaleString()}, expenditure=${oxfam.expenditure_total?.toLocaleString()}, net=${oxfam.net_income?.toLocaleString()}`)
  } else if (mapped.length > 0) {
    const s = mapped[0]
    console.log(`  Sample [${s.registration_number}]: income=${s.income_total}, expenditure=${s.expenditure_total}, net=${s.net_income}`)
  }

  const total = await batchUpsert(supabase, 'cc_financial_history', mapped, 'registration_number,period_end_date', dryRun, 'Financial')

  // ── Also populate cc_annual_return from the same file ──────────────────────
  // The annual return history file contains compliance dates that the preamble
  // file (which 404s) would normally provide.
  console.log('  📋 Also writing compliance data to cc_annual_return...')
  const returnsMapped = rows
    .filter(r => r['registered_charity_number'] && r['ar_cycle_reference'])
    .map(r => ({
      registration_number:     r['registered_charity_number'],
      ar_cycle_reference:      r['ar_cycle_reference'] || null,
      date_return_received:    parseDate(r['date_annual_return_received']),
      date_return_required:    parseDate(r['reporting_due_date']),
      total_gross_income:      parseBigInt(r['total_gross_income']),
      total_gross_expenditure: parseBigInt(r['total_gross_expenditure']),
      // accounts_received = true if accounts were received (date_accounts_received is set)
      accounts_required:       true,
      accounts_received:       !!r['date_accounts_received']?.trim() || null,
      accounts_type:           r['accounts_qualified'] === 'TRUE' ? 'Qualified' :
                               r['accounts_qualified'] === 'FALSE' ? 'Unqualified' : null,
      period_end:              parseDate(r['fin_period_end_date']),
    }))

  await batchUpsert(supabase, 'cc_annual_return', returnsMapped, 'registration_number,ar_cycle_reference', dryRun, 'Annual Returns')

  return total
}

async function importGeographicAreas(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [3/9] Geographic areas...')
  const content = await downloadAndExtract('publicextract.charity_area_of_operation.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} area records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && (r['geographic_area_description'] || r['geographic_area']))
    .map(r => ({
      registration_number: r['registered_charity_number'],
      geographic_area:     r['geographic_area_description'] || r['geographic_area'] || '',
    }))

  return batchUpsert(supabase, 'cc_geographic_area', mapped, 'registration_number,geographic_area', dryRun, 'Geographic')
}

async function importClassifications(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [4/9] Classifications...')
  const content = await downloadAndExtract('publicextract.charity_classification.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} classification records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['classification_code'])
    .map(r => ({
      registration_number:  r['registered_charity_number'],
      classification_code:  r['classification_code'],
      classification_type:  r['classification_type'] || '',
      classification_desc:  r['classification_desc'] || r['classification_description'] || null,
    }))

  return batchUpsert(supabase, 'cc_classification', mapped, 'registration_number,classification_code,classification_type', dryRun, 'Classifications')
}

async function importTrustees(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [5/9] Trustees...')
  const content = await downloadAndExtract('publicextract.charity_trustee.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} trustee records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['trustee_name'])
    .map(r => ({
      registration_number: r['registered_charity_number'],
      trustee_id:          r['trustee_id']    || null,
      trustee_name:        r['trustee_name'],
      is_chair:            parseBool(r['trustee_is_chair']) ?? false,
    }))

  return batchUpsert(supabase, 'cc_trustee', mapped, 'registration_number,trustee_name', dryRun, 'Trustees')
}

async function importOtherNames(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [6/9] Other / previous names...')
  const content = await downloadAndExtract('publicextract.charity_other_names.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} name records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['charity_name'])
    .map(r => ({
      registration_number: r['registered_charity_number'],
      name_type:           r['charity_name_type'] || 'Other',
      name:                r['charity_name'],
    }))

  return batchUpsert(supabase, 'cc_other_name', mapped, 'registration_number,name_type,name', dryRun, 'Names')
}

async function importGoverningDocument(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [7/9] Governing documents (charitable objects update)...')
  const content = await downloadAndExtract('publicextract.charity_governing_document.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} governing document records`)

  if (!dryRun) {
    const BATCH = 200
    let updated = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const r of batch) {
        const regNum = r['registered_charity_number']
        const objects = r['charitable_objects'] || r['governing_document_description'] || ''
        if (regNum && objects) {
          await supabase
            .from('cc_charity_core')
            .update({ charitable_objects: objects })
            .eq('registration_number', regNum)
          updated++
        }
      }
      if ((i + BATCH) % 5000 === 0 || i + BATCH >= rows.length) {
        console.log(`  Governing docs: ${Math.min(i + BATCH, rows.length).toLocaleString()} / ${rows.length.toLocaleString()} rows processed`)
      }
    }
    return updated
  }
  return rows.length
}

async function importEvents(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [8/9] Events (registration history)...')
  const content = await downloadAndExtract('publicextract.charity_event.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} event records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['charity_event_type'])
    .map(r => ({
      registration_number: r['registered_charity_number'],
      event_type:          r['charity_event_type'],
      date_of_event:       parseDate(r['date_of_event']),
      reason_for_event:    r['reason_for_event'] || null,
    }))

  // Events don't have a clean unique key — delete+re-insert per charity not feasible for bulk
  // Use insert with ignoreDuplicates=true after clearing (not possible without unique key)
  // Workaround: skip existing, insert new by using truncate+insert approach for events
  if (!dryRun) {
    const BATCH = 500
    let total = 0
    for (let i = 0; i < mapped.length; i += BATCH) {
      const { error } = await supabase.from('cc_event').insert(mapped.slice(i, i + BATCH))
      if (error && !error.message.includes('duplicate')) {
        console.error(`  ⚠️  Event insert error at ${i}: ${error.message}`)
      }
      total += BATCH
      if ((i + BATCH) % 5000 === 0 || i + BATCH >= mapped.length) {
        console.log(`  Events: ${Math.min(total, mapped.length).toLocaleString()} / ${mapped.length.toLocaleString()} rows processed`)
      }
    }
    return total
  }
  return mapped.length
}

async function importLinkedCharities(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [9a/9] Linked charities...')
  const content = await downloadAndExtract('publicextract.charity_linked_charity.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} linked charity records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'] && r['linked_charity_number'])
    .map(r => ({
      registration_number:   r['registered_charity_number'],
      linked_charity_number: r['linked_charity_number'],
      linked_charity_name:   r['linked_charity_name'] || null,
    }))

  return batchUpsert(supabase, 'cc_linked_charity', mapped, 'registration_number,linked_charity_number', dryRun, 'Linked')
}

async function importAnnualReturns(supabase: ReturnType<typeof createClient>, dryRun: boolean) {
  console.log('\n📥 [9b/9] Annual return compliance...')
  const content = await downloadAndExtract('publicextract.charity_annual_return_preamble.zip')
  const rows    = parseTSV(content)
  console.log(`  Parsed ${rows.length.toLocaleString()} annual return records`)

  const mapped = rows
    .filter(r => r['registered_charity_number'])
    .map(r => ({
      registration_number:    r['registered_charity_number'],
      ar_cycle_reference:     r['ar_cycle_reference']               || null,
      date_return_received:   parseDate(r['date_annual_return_received']),
      date_return_required:   parseDate(r['date_annual_return_required']),
      total_gross_income:     parseBigInt(r['total_gross_income']),
      total_gross_expenditure: parseBigInt(r['total_gross_expenditure']),
      accounts_required:      parseBool(r['accounts_required']),
      accounts_received:      parseBool(r['accounts_received']),
      accounts_type:          r['accounts_type'] || null,
      period_end:             parseDate(r['period_end']),
    }))
    .filter(r => r.ar_cycle_reference)

  return batchUpsert(supabase, 'cc_annual_return', mapped, 'registration_number,ar_cycle_reference', dryRun, 'Returns')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith('--'))
      .map(a => {
        const [k, v] = a.slice(2).split('=')
        return [k, v ?? 'true']
      })
  )

  const dryRun       = args['dry-run'] === 'true'
  const fileArg      = args['file'] as string | undefined
  const showHeaders  = args['show-headers'] === 'true'

  // --show-headers: download each file and print column names only
  if (showHeaders) {
    const filesToCheck = [
      { key: 'financial', zip: 'publicextract.charity_annual_return_history.zip' },
      { key: 'core',      zip: 'publicextract.charity.zip' },
      { key: 'geographic', zip: 'publicextract.charity_area_of_operation.zip' },
    ]
    for (const f of filesToCheck) {
      if (fileArg && !f.key.includes(fileArg)) continue
      try {
        console.log(`\n📋 Headers for ${f.key} (${f.zip}):`)
        const content = await downloadAndExtract(f.zip)
        const rows    = parseTSV(content)
        if (rows.length > 0) {
          const cols = Object.keys(rows[0])
          cols.forEach((c, i) => console.log(`  [${i}] ${c}`))
          console.log(`  --- Sample row ---`)
          const sample = rows.find(r => r['registered_charity_number'] === '202918') ?? rows[1]
          if (sample) {
            Object.entries(sample).forEach(([k, v]) => {
              if (v) console.log(`  ${k}: ${v}`)
            })
          }
        }
      } catch (e) {
        console.error(`  ❌ ${f.key}: ${e}`)
      }
    }
    return
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('═══════════════════════════════════════════════════════')
  console.log('  FundsRadar · Charity Commission Bulk Import')
  console.log('═══════════════════════════════════════════════════════')
  if (dryRun) console.log('  ⚠️  DRY RUN — no data will be written')
  if (fileArg) console.log(`  File filter: ${fileArg}`)
  console.log(`  Source: ${BASE}`)
  console.log('')

  // Insert sync log
  let syncLogId: string | null = null
  if (!dryRun) {
    const { data } = await supabase
      .from('cc_sync_log')
      .insert({ status: 'running' })
      .select('id')
      .single()
    syncLogId = data?.id ?? null
  }

  const startMs = Date.now()
  const counts: Record<string, number> = {}
  let hasError = false

  async function run(key: string, fn: () => Promise<number>) {
    if (fileArg && !key.includes(fileArg)) return
    try {
      counts[key] = await fn()
      console.log(`  ✅  ${key}: ${counts[key].toLocaleString()} rows`)
    } catch (err) {
      console.error(`  ❌  ${key} failed:`, err)
      hasError = true
      counts[key] = 0
    }
  }

  await run('core',       () => importCore(supabase, dryRun))
  await run('financial',  () => importFinancialHistory(supabase, dryRun))
  await run('geographic', () => importGeographicAreas(supabase, dryRun))
  await run('classification', () => importClassifications(supabase, dryRun))
  await run('trustees',   () => importTrustees(supabase, dryRun))
  await run('names',      () => importOtherNames(supabase, dryRun))
  await run('governing',  () => importGoverningDocument(supabase, dryRun))
  await run('events',     () => importEvents(supabase, dryRun))
  await run('linked',     () => importLinkedCharities(supabase, dryRun))
  await run('returns',    () => importAnnualReturns(supabase, dryRun))

  const durationMs = Date.now() - startMs

  // Update sync log
  if (!dryRun && syncLogId) {
    await supabase.from('cc_sync_log').update({
      completed_at:    new Date().toISOString(),
      status:          hasError ? 'partial' : 'success',
      rows_core:       counts.core       ?? 0,
      rows_financial:  counts.financial  ?? 0,
      rows_geographic: counts.geographic ?? 0,
      rows_class:      counts.classification ?? 0,
      rows_trustees:   counts.trustees   ?? 0,
      rows_names:      counts.names      ?? 0,
      rows_events:     counts.events     ?? 0,
      rows_linked:     counts.linked     ?? 0,
      rows_returns:    counts.returns    ?? 0,
      duration_ms:     durationMs,
    }).eq('id', syncLogId)
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Import complete')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Core charities   : ${(counts.core       ?? 0).toLocaleString()}`)
  console.log(`  Financial records: ${(counts.financial  ?? 0).toLocaleString()}`)
  console.log(`  Geographic areas : ${(counts.geographic ?? 0).toLocaleString()}`)
  console.log(`  Classifications  : ${(counts.classification ?? 0).toLocaleString()}`)
  console.log(`  Trustees         : ${(counts.trustees   ?? 0).toLocaleString()}`)
  console.log(`  Other names      : ${(counts.names      ?? 0).toLocaleString()}`)
  console.log(`  Events           : ${(counts.events     ?? 0).toLocaleString()}`)
  console.log(`  Linked charities : ${(counts.linked     ?? 0).toLocaleString()}`)
  console.log(`  Annual returns   : ${(counts.returns    ?? 0).toLocaleString()}`)
  console.log(`  Duration         : ${(durationMs / 1000 / 60).toFixed(1)} minutes`)
  if (dryRun) console.log('  ⚠️  Dry run — no data was written to DB')
  console.log('')
}

main().catch(err => {
  console.error('❌  Fatal error:', err)
  process.exit(1)
})
