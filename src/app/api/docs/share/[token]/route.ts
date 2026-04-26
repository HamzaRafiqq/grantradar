import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

// GET /api/docs/share/[token] — resolve token → signed storage URL (redirect)
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: share } = await supabase
    .from('document_shares')
    .select('*, document:documents(storage_path, name, file_type)')
    .eq('token', token)
    .single()

  if (!share) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  if (new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
  }

  const { data: signed } = await supabase.storage
    .from('charity-documents')
    .createSignedUrl(share.document.storage_path, 3600)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
