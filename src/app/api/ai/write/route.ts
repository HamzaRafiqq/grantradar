import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSuggestion } from '@/lib/ai/application-writer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('plan').eq('id', user.id).single()

  if (!['pro', 'agency'].includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Pro or Agency plan required' }, { status: 403 })
  }

  const { question, currentText, charityProfile, grantCriteria } = await req.json()

  try {
    const suggestion = await generateSuggestion(
      question,
      currentText ?? '',
      charityProfile,
      grantCriteria ?? '',
    )
    return NextResponse.json({ suggestion })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
