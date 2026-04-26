import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/documents/[id]/share — generate a 30-day share token
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { expiryDays = 30 } = await req.json().catch(() => ({}))

  // Verify ownership
  const { data: doc } = await supabase
    .from('documents')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: share, error } = await supabase
    .from('document_shares')
    .insert({ document_id: id, expires_at: expiresAt })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fundsradar.co'
  const shareUrl = `${appUrl}/docs/share/${share.token}`

  return NextResponse.json({ token: share.token, url: shareUrl, expiresAt })
}

// DELETE /api/documents/[id]/share — revoke all share tokens for a doc
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const { data: doc } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('document_shares').delete().eq('document_id', id)
  return NextResponse.json({ ok: true })
}
