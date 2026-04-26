import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreAnswer } from '@/lib/ai/application-writer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('plan').eq('id', user.id).single()

  if (!['pro', 'agency'].includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Pro or Agency plan required' }, { status: 403 })
  }

  const { question, answer, grantCriteria, charityProfile } = await req.json()

  try {
    const result = await scoreAnswer(question, answer, grantCriteria ?? '', charityProfile)
    return NextResponse.json({ result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
