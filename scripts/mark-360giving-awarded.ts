#!/usr/bin/env node
/**
 * Mark all 360Giving grants as grant_type='awarded' in small batches
 * to avoid Supabase statement timeouts.
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

  const BATCH = 30
  let total = 0
  const startMs = Date.now()

  console.log('Marking 360Giving grants as awarded...')

  while (true) {
    // Fetch a small batch still marked as opportunity
    const { data, error } = await supabase
      .from('grants')
      .select('id')
      .eq('source', '360giving')
      .eq('grant_type', 'opportunity')
      .limit(BATCH)

    if (error) { console.error('Fetch error:', error.message); break }
    if (!data || data.length === 0) break

    const ids = data.map((r: { id: string }) => r.id)
    const { error: updateError } = await supabase
      .from('grants')
      .update({ grant_type: 'awarded' })
      .in('id', ids)

    if (updateError) { console.error('Update error:', updateError.message); break }

    total += ids.length
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(0)
    process.stdout.write(`\r  ${total.toLocaleString()} marked as awarded in ${elapsed}s...`)
    await new Promise(r => setTimeout(r, 50))
  }

  console.log(`\n✅ Done — ${total.toLocaleString()} 360Giving grants marked as awarded`)

  // Verify final counts
  const { count: opps } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('grant_type', 'opportunity')
    .eq('is_active', true)

  const { count: awarded } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('grant_type', 'awarded')

  console.log(`   Active opportunities: ${(opps ?? 0).toLocaleString()}`)
  console.log(`   Awarded (historical): ${(awarded ?? 0).toLocaleString()}`)
}

main().catch(console.error)
