import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data: app, error } = await supabase
    .from('funder_applications')
    .select(`
      *,
      grant:funder_grants!inner(*, funder_id, questions:funder_grant_questions(*)),
      org:organisations(*)
    `)
    .eq('id', id)
    .single()

  if (error || !app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify the requesting user is the funder
  if ((app.grant as { funder_id: string }).funder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch answers
  const { data: answers } = await supabase
    .from('funder_application_answers')
    .select('*, question:funder_grant_questions(question, type)')
    .eq('application_id', id)

  // Fetch trust score history
  const { data: trustHistory } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('org_id', (app.org as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ application: app, answers: answers ?? [], trustHistory })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Verify ownership via grant
  const { data: app } = await supabase
    .from('funder_applications')
    .select('grant:funder_grants!inner(funder_id)')
    .eq('id', id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!app || (app.grant as any)?.funder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('funder_applications')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}
