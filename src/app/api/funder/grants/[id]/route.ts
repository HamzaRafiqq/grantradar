import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

async function assertOwner(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, id: string, userId: string) {
  const { data } = await supabase
    .from('funder_grants').select('id').eq('id', id).eq('funder_id', userId).maybeSingle()
  return !!data
}

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('funder_grants')
    .select('*, questions:funder_grant_questions(*)')
    .eq('id', id)
    .eq('funder_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ grant: data })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { questions: questionsRaw, ...body } = await req.json()

  const { data, error } = await supabase
    .from('funder_grants')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Replace questions if provided
  if (Array.isArray(questionsRaw)) {
    await supabase.from('funder_grant_questions').delete().eq('grant_id', id)
    if (questionsRaw.length > 0) {
      await supabase.from('funder_grant_questions').insert(
        questionsRaw.map((q: { question: string; type: string; required: boolean }, idx: number) => ({
          grant_id: id, question: q.question, type: q.type ?? 'text',
          required: q.required ?? true, order_idx: idx,
        })),
      )
    }
  }

  return NextResponse.json({ grant: data })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase.from('funder_grants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
