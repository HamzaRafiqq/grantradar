import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/settings?key=waitlist_mode
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const key = req.nextUrl.searchParams.get('key')
  const supabase = serviceClient()

  if (key) {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single()
    return NextResponse.json({ key, value: data?.value ?? null })
  }

  const { data } = await supabase.from('site_settings').select('*')
  return NextResponse.json(data ?? [])
}

// POST /api/admin/settings  body: { key, value }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, value } = await req.json() as { key: string; value: string }
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const supabase = serviceClient()
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) {
    console.error('Settings upsert error:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, key, value })
}
