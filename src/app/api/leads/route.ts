import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json() as { email?: string; source?: string }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('leads')
      .upsert(
        { email: email.toLowerCase().trim(), source: source ?? 'unknown', subscribed: true },
        { onConflict: 'email', ignoreDuplicates: false }
      )

    if (error) {
      console.error('leads upsert error:', error)
      return NextResponse.json({ error: 'Failed to save — please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('leads route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
