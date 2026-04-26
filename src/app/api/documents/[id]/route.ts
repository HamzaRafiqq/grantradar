import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/documents/[id] — update name or expiry_date
export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { name, expiry_date } = await req.json()

  const updates: Record<string, unknown> = {}
  if (name !== undefined)        updates.name        = name
  if (expiry_date !== undefined) updates.expiry_date = expiry_date || null

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/documents/[id] — remove from storage + DB
export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove from Supabase Storage
  await supabase.storage.from('charity-documents').remove([doc.storage_path])

  // Remove DB record (shares cascade-delete)
  const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// GET /api/documents/[id] — generate signed download URL
export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, name, file_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: signed } = await supabase.storage
    .from('charity-documents')
    .createSignedUrl(doc.storage_path, 3600) // 1 hour

  if (!signed?.signedUrl) return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl })
}
