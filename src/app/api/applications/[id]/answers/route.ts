import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/applications/[id]/answers
export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('application_answers')
    .select('id, question, answer, ai_score, updated_at')
    .eq('match_id', id)
    .eq('user_id', user.id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ answers: data ?? [] })
}

// PUT /api/applications/[id]/answers — upsert one answer
export async function PUT(req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { question, answer, ai_score } = await req.json()

  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('application_answers')
    .upsert(
      {
        match_id: id,
        user_id:  user.id,
        question,
        answer:   answer ?? '',
        ai_score: ai_score ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'match_id,question' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ answer: data })
}
