import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/documents — list all documents for authenticated org
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase.from('organisations').select('id').eq('user_id', user.id).single()
  if (!org) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
