#!/usr/bin/env node
/**
 * One-time migration: Make grants.deadline nullable
 * Run: npx tsx scripts/run-migration-015.ts
 *
 * This uses the Supabase Management API to run DDL.
 * You must set SUPABASE_ACCESS_TOKEN (your personal access token from supabase.com/dashboard/account/tokens)
 */

import { readFileSync } from 'fs'
import { join } from 'path'

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
  } catch { /* no .env.local */ }
}

async function main() {
  loadEnv()

  const projectRef = 'qwusrijtsrdhdkhvddei'
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    console.error('❌  Missing SUPABASE_ACCESS_TOKEN')
    console.error('')
    console.error('  1. Go to https://supabase.com/dashboard/account/tokens')
    console.error('  2. Generate a new access token')
    console.error('  3. Add to .env.local:  SUPABASE_ACCESS_TOKEN=your_token_here')
    console.error('  4. Re-run this script')
    console.error('')
    console.error('  OR run this SQL directly in the Supabase SQL Editor:')
    console.error('  https://supabase.com/dashboard/project/qwusrijtsrdhdkhvddei/sql/new')
    console.error('')
    console.error('  ALTER TABLE grants ALTER COLUMN deadline DROP NOT NULL;')
    console.error('')
    console.error('  CREATE UNIQUE INDEX IF NOT EXISTS grants_application_url_idx')
    console.error('    ON grants (application_url)')
    console.error('    WHERE application_url IS NOT NULL;')
    process.exit(1)
  }

  const sqls = [
    'ALTER TABLE grants ALTER COLUMN deadline DROP NOT NULL',
    `CREATE UNIQUE INDEX IF NOT EXISTS grants_application_url_idx
     ON grants (application_url)
     WHERE application_url IS NOT NULL`,
  ]

  for (const sql of sqls) {
    console.log(`Running: ${sql.slice(0, 60)}...`)
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    )
    const body = await res.json()
    if (!res.ok) {
      console.error('❌  Failed:', body)
      process.exit(1)
    }
    console.log('✓  Done')
  }

  console.log('')
  console.log('✅  Migration 015 applied successfully!')
  console.log('   grants.deadline is now nullable')
  console.log('   Ready to run the grant import.')
}

main()
