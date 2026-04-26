import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCommand, type Command } from '@/lib/ai/application-writer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('plan').eq('id', user.id).single()

  if (!['pro', 'agency'].includes(profile?.plan ?? '')) {
    return NextResponse.json({ error: 'Pro or Agency plan required' }, { status: 403 })
  }

  const { command, text, charityProfile, grantCriteria, question } = await req.json()

  if (!text?.trim()) return NextResponse.json({ error: 'No text to process' }, { status: 400 })

  try {
    const result = await executeCommand(
      command as Command,
      text,
      charityProfile,
      grantCriteria ?? '',
      question ?? '',
    )
    return NextResponse.json({ result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
