#!/usr/bin/env node
/**
 * Mark historical 360Giving grants (null deadline) as inactive.
 * Uses tiny batches of 20 IDs to stay well under Supabase REST timeout.
 */

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
  } catch { /* ignore */ }
}

async function main() {
  loadEnv()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]
  const BATCH = 20
  let total = 0
  let iterations = 0

  console.log('Deactivating historical 360Giving grants...')
  const startMs = Date.now()

  while (true) {
    // Fetch a tiny batch of IDs that are still active + have null/past deadline
    const { data, error } = await supabase
      .from('grants')
      .select('id')
      .eq('source', '360giving')
      .eq('is_active', true)
      .or(`deadline.is.null,deadline.lt.${today}`)
      .limit(BATCH)

    if (error) {
      console.error('Fetch error:', error.message)
      break
    }
    if (!data || data.length === 0) break

    const ids = data.map((r: { id: string }) => r.id)

    // Update just these IDs
    const { error: updateError } = await supabase
      .from('grants')
      .update({ is_active: false })
      .in('id', ids)

    if (updateError) {
      console.error('Update error:', updateError.message)
      break
    }

    total += ids.length
    iterations++

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(0)
    process.stdout.write(`\r  ${total.toLocaleString()} deactivated in ${elapsed}s (${iterations} batches)...`)

    // Small delay to be kind to the DB
    await new Promise(r => setTimeout(r, 50))
  }

  console.log('\n')

  // Final active count
  const { count } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  console.log(`✅  Done — ${total.toLocaleString()} historical grants marked inactive`)
  console.log(`   Active (open) grants now: ${(count ?? 0).toLocaleString()}`)
}

main().catch(e => { console.error(e); process.exit(1) })
