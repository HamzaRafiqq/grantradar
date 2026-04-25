import { NextRequest, NextResponse } from 'next/server'
import { runImport } from '@/lib/import360giving'

function makeSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function doImport(recent = true) {
  const supabase = makeSupabase()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const summary = await runImport(supabase, {
    // Cron: process publishers updated in the last 30 days, max 25 per run
    // to stay within Vercel's 60-second function timeout
    since: recent ? thirtyDaysAgo : undefined,
    maxPublishers: 25,
    verbose: false,
  })

  // Log to sync_log table (best-effort)
  try {
    const errors = summary.results.filter(r => r.error)
    await supabase.from('sync_log').insert({
      source: '360giving',
      grants_added: summary.totalAdded,
      grants_updated: summary.totalUpdated,
      publishers: summary.publishersProcessed,
      duration_ms: summary.durationMs,
      errors: errors.length,
      created_at: new Date().toISOString(),
    })
  } catch { /* sync_log optional */ }

  return summary
}

// ── Vercel cron (GET) — called by vercel.json schedule ───────────────────────
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const summary = await doImport(true)
    return NextResponse.json({
      ok: true,
      added: summary.totalAdded,
      updated: summary.totalUpdated,
      publishers: summary.publishersProcessed,
      durationMs: summary.durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('360Giving cron error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Manual trigger (POST) — protected by SYNC_SECRET ─────────────────────────
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-key')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    // Pass recent=false to process all publishers (full refresh)
    const summary = await doImport(body.full === true ? false : true)
    return NextResponse.json({
      ok: true,
      added: summary.totalAdded,
      updated: summary.totalUpdated,
      publishers: summary.publishersProcessed,
      durationMs: summary.durationMs,
      results: summary.results.map(r => ({
        publisher: r.publisher,
        added: r.added,
        updated: r.updated,
        error: r.error,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('360Giving manual sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
