import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf':                                                  'pdf',
  'application/msword':                                               'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel':                                         'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/png':                                                        'png',
  'image/jpeg':                                                       'jpg',
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Plan gate — Pro + Agency only
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (!['pro', 'agency'].includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Document vault requires Pro plan' }, { status: 403 })
  }

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const formData = await req.formData()
  const file     = formData.get('file')     as File | null
  const category = formData.get('category') as string | null
  const name     = formData.get('name')     as string | null
  const expiry   = formData.get('expiry')   as string | null

  if (!file || !category || !name) {
    return NextResponse.json({ error: 'file, category and name are required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
  }

  const ext          = ALLOWED_TYPES[file.type]
  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const storagePath  = `${org.id}/${safeFilename}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: storageError } = await supabase.storage
    .from('charity-documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      org_id:       org.id,
      user_id:      user.id,
      name:         name.trim(),
      category,
      storage_path: storagePath,
      file_size:    file.size,
      file_type:    ext,
      expiry_date:  expiry || null,
    })
    .select()
    .single()

  if (dbError) {
    // Clean up orphaned storage file
    await supabase.storage.from('charity-documents').remove([storagePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ data: doc })
}
