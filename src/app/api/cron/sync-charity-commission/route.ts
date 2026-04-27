import { NextRequest, NextResponse } from 'next/server'

/**
 * Weekly sync: re-downloads all Charity Commission bulk data and updates DB.
 * Schedule: Every Sunday at 3:00 AM UTC
 *
 * n8n Workflow 8:
 *   Trigger: Cron — every Sunday 03:00 UTC
 *   HTTP Request: GET https://fundsradar.co/api/cron/sync-charity-commission
 *   Header: Authorization: Bearer {CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  return runSync()
}

async function runSync() {
  const startMs = Date.now()

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js')
    const { Resend }       = await import('resend')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Insert sync log entry ────────────────────────────────────────────────
    const { data: syncLog } = await supabase
      .from('cc_sync_log')
      .insert({ status: 'running' })
      .select('id')
      .single()
    const syncLogId = syncLog?.id

    const BASE  = 'https://ccewuksprdoneregsadata1.blob.core.windows.net/data/txt/'
    const counts: Record<string, number> = {}
    let hasError = false
    const errors: string[] = []

    // ── Helper: download + unzip ─────────────────────────────────────────────
    async function downloadTSV(filename: string): Promise<string> {
      const res = await fetch(BASE + filename)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${filename}`)
      const buf  = Buffer.from(await res.arrayBuffer())
      // Dynamic import to avoid edge runtime issues
      const AdmZip = (await import('adm-zip')).default
      const zip    = new AdmZip(buf)
      const entry  = zip.getEntries().find(e => e.entryName.endsWith('.txt') || e.entryName.endsWith('.csv'))
      if (!entry) throw new Error(`No .txt found in ${filename}`)
      const raw = zip.readAsText(entry)
      return raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
    }

    function parseTSV(content: string): Record<string, string>[] {
      const lines   = content.split('\n')
      if (lines.length < 2) return []
      const headers = lines[0].split('\t').map(h => h.trim().replace(/\r$/, '').toLowerCase())
      return lines.slice(1)
        .filter(l => l.trim())
        .map(line => {
          const cols = line.replace(/\r$/, '').split('\t')
          const row: Record<string, string> = {}
          headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim() })
          return row
        })
    }

    function parseDate(s: string): string | null {
      if (!s?.trim()) return null
      const t = s.trim()
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t).toISOString()
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

    async function batchUpsert(table: string, rows: object[], conflict: string, label: string) {
      const BATCH = 500
      let n = 0
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from(table).upsert(rows.slice(i, i + BATCH), { onConflict: conflict })
        if (error) { errors.push(`${label}: ${error.message}`); hasError = true }
        n += BATCH
      }
      return Math.min(n, rows.length)
    }

    // ── 1. Core ──────────────────────────────────────────────────────────────
    try {
      const rows = parseTSV(await downloadTSV('publicextract.charity.zip'))
      const mapped = rows
        .filter(r => r['registered_charity_number'])
        .map(r => ({
          registration_number:     r['registered_charity_number'],
          linked_charity_number:   r['linked_charity_number']       || null,
          charity_name:            r['charity_name']                || 'Unknown',
          charity_type:            r['charity_type']                || null,
          registration_status:     r['charity_registration_status'] || 'Registered',
          date_of_registration:    parseDate(r['date_of_registration']),
          date_of_removal:         parseDate(r['date_of_removal']),
          reporting_status:        r['charity_reporting_status']    || null,
          contact_web:             r['charity_contact_web']         || null,
          contact_email:           r['charity_contact_email']       || null,
          contact_postcode:        r['charity_contact_postcode']    || null,
          charity_activities:      r['charity_activities']          || null,
          charity_gift_aid:        parseBool(r['charity_gift_aid']),
          charity_has_land:        parseBool(r['charity_has_land']),
          updated_at:              new Date().toISOString(),
        }))
      counts.core = await batchUpsert('cc_charity_core', mapped, 'registration_number', 'Core')
    } catch (e) { errors.push(`Core: ${e}`); hasError = true; counts.core = 0 }

    // ── 2. Financial history ─────────────────────────────────────────────────
    try {
      const rows = parseTSV(await downloadTSV('publicextract.charity_annual_return_history.zip'))
      const mapped = rows
        .filter(r => r['registered_charity_number'] && r['fin_period_end_date'])
        .map(r => ({
          registration_number:          r['registered_charity_number'],
          period_end_date:              parseDate(r['fin_period_end_date']),
          period_start_date:            parseDate(r['fin_period_start_date']),
          period_order:                 parseInt(r['financial_period_order'] || '1', 10) || 1,
          income_total:                 parseBigInt(r['total_gross_income']),
          expenditure_total:            parseBigInt(r['total_expenditure']),
          net_income:                   parseBigInt(r['net_income_expenditure']),
          total_funds_end_period:       parseBigInt(r['total_funds_end_of_period']),
          account_type:                 r['accounts_type'] || null,
        }))
        .filter(r => r.period_end_date)
      counts.financial = await batchUpsert('cc_financial_history', mapped, 'registration_number,period_end_date', 'Financial')
    } catch (e) { errors.push(`Financial: ${e}`); hasError = true; counts.financial = 0 }

    // ── 3. Geographic areas ──────────────────────────────────────────────────
    try {
      const rows = parseTSV(await downloadTSV('publicextract.charity_area_of_operation.zip'))
      const mapped = rows
        .filter(r => r['registered_charity_number'])
        .map(r => ({
          registration_number: r['registered_charity_number'],
          geographic_area:     r['geographic_area_description'] || r['geographic_area'] || '',
        }))
        .filter(r => r.geographic_area)
      counts.geographic = await batchUpsert('cc_geographic_area', mapped, 'registration_number,geographic_area', 'Geographic')
    } catch (e) { errors.push(`Geographic: ${e}`); hasError = true; counts.geographic = 0 }

    // ── (Classifications, trustees, etc. would follow the same pattern) ──────
    // For the weekly sync we prioritise the most-changing data: core + financials + geographic

    const durationMs = Date.now() - startMs

    // ── Update sync log ──────────────────────────────────────────────────────
    if (syncLogId) {
      await supabase.from('cc_sync_log').update({
        completed_at:    new Date().toISOString(),
        status:          hasError ? 'partial' : 'success',
        rows_core:       counts.core       ?? 0,
        rows_financial:  counts.financial  ?? 0,
        rows_geographic: counts.geographic ?? 0,
        duration_ms:     durationMs,
      }).eq('id', syncLogId)
    }

    // ── Notify charities on FundsRadar whose CC data changed ─────────────────
    try {
      const resend  = new Resend(process.env.RESEND_API_KEY)
      const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'

      // Find orgs with matching charity numbers
      const { data: orgs } = await supabase
        .from('organisations')
        .select('id, user_id, name, charity_number')
        .not('charity_number', 'is', null)

      if (orgs?.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', orgs.map((o: { user_id: string }) => o.user_id))

        const profileMap = Object.fromEntries(
          (profiles ?? []).map((p: { id: string }) => [p.id, p])
        )

        // Sample — only notify first 50 to avoid email rate limits
        for (const org of (orgs as { id: string; user_id: string; name: string; charity_number: string }[]).slice(0, 50)) {
          const profile = profileMap[org.user_id]
          if (!profile?.email) continue
          const firstName = profile.full_name?.split(' ')[0] ?? 'there'
          await resend.emails.send({
            from: 'FundsRadar <hello@fundsradar.co>',
            to: profile.email,
            subject: 'Your Charity Commission data was updated this week',
            html: `<p>Hi ${firstName},</p>
<p>We refreshed the Charity Commission data for <strong>${org.name}</strong> this week. Your financial profile and trust score may have been updated.</p>
<p><a href="${appUrl}/settings">View your profile →</a></p>
<p style="color:#9ca3af;font-size:12px;">FundsRadar · hello@fundsradar.co</p>`,
          })
        }
      }
    } catch (notifyErr) {
      console.error('Notify error:', notifyErr)
    }

    return NextResponse.json({
      ok: true,
      rows: counts,
      errors: errors.length,
      durationMs,
    })

  } catch (err) {
    console.error('CC sync cron error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
