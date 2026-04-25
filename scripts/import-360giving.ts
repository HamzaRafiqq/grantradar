#!/usr/bin/env node
/**
 * 360Giving grant import script
 *
 * Usage:
 *   npm run import:360giving
 *   npm run import:360giving -- --since=2025-01-01
 *   npm run import:360giving -- --max=10
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { runImport } from '../src/lib/import360giving'

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const lines = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (key && !process.env[key]) process.env[key] = val
    }
  } catch {
    // No .env.local — rely on shell environment
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()

  // Parse CLI args: --since=YYYY-MM-DD, --max=N
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((a: string) => a.startsWith('--'))
      .map((a: string) => {
        const [k, v] = a.slice(2).split('=')
        return [k, v ?? 'true']
      })
  )

  const maxPublishers = args.max ? parseInt(args.max as string, 10) : undefined
  const since = args.since as string | undefined

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('    Make sure .env.local exists or env vars are exported')
    process.exit(1)
  }

  console.log('═══════════════════════════════════════════════════════')
  console.log('  FundsRadar · 360Giving Import')
  console.log('═══════════════════════════════════════════════════════')
  if (since)         console.log(`  Since:           ${since}`)
  if (maxPublishers) console.log(`  Max publishers:  ${maxPublishers}`)
  console.log('')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    const summary = await runImport(supabase, {
      maxPublishers,
      since,
      verbose: true,
    })

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('  Import complete')
    console.log('═══════════════════════════════════════════════════════')
    console.log(`  Publishers processed : ${summary.publishersProcessed}`)
    console.log(`  Grants added         : ${summary.totalAdded}`)
    console.log(`  Grants updated       : ${summary.totalUpdated}`)
    console.log(`  Duration             : ${(summary.durationMs / 1000).toFixed(1)}s`)
    console.log('')

    const errors = summary.results.filter(r => r.error)
    if (errors.length > 0) {
      console.log(`  Errors (${errors.length}):`)
      for (const e of errors) {
        console.log(`    ✗ ${e.publisher}: ${e.error}`)
      }
    }

    // Log to sync_log table if it exists
    try {
      await supabase.from('sync_log').insert({
        source: '360giving',
        grants_added: summary.totalAdded,
        grants_updated: summary.totalUpdated,
        publishers: summary.publishersProcessed,
        duration_ms: summary.durationMs,
        errors: errors.length,
        created_at: new Date().toISOString(),
      })
    } catch {
      // sync_log table is optional
    }

  } catch (err) {
    console.error('❌  Import failed:', err)
    process.exit(1)
  }
}

main()
