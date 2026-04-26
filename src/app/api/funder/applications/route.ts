import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url  = new URL(req.url)
  const grantId = url.searchParams.get('grant_id')
  const status  = url.searchParams.get('status')

  let query = supabase
    .from('funder_applications')
    .select(`
      *,
      grant:funder_grants!inner(id, title, funder_id),
      org:organisations(id, name, charity_number, location, annual_income, trust_score)
    `)
    .eq('funder_grants.funder_id', user.id)
    .order('submitted_at', { ascending: false })

  if (grantId) query = query.eq('grant_id', grantId)
  if (status)  query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data ?? [] })
}
