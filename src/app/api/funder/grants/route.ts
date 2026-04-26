import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('funder_grants')
    .select(`
      *,
      questions:funder_grant_questions(count),
      applications:funder_applications(count)
    `)
    .eq('funder_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grants: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify funder profile exists
  const { data: profile } = await supabase
    .from('funder_profiles').select('id').eq('id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Complete funder onboarding first' }, { status: 403 })

  const { questions: questionsRaw, ...grantBody } = await req.json()

  const { data: grant, error } = await supabase
    .from('funder_grants')
    .insert({ ...grantBody, funder_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert questions if provided
  if (Array.isArray(questionsRaw) && questionsRaw.length > 0) {
    const rows = questionsRaw.map((q: { question: string; type: string; required: boolean }, idx: number) => ({
      grant_id: grant.id,
      question: q.question,
      type: q.type ?? 'text',
      required: q.required ?? true,
      order_idx: idx,
    }))
    await supabase.from('funder_grant_questions').insert(rows)
  }

  return NextResponse.json({ grant }, { status: 201 })
}
