import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/applications — all grant_matches for the authenticated user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/applications — manually add a grant to the pipeline
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { grant_id, amount_requested } = await req.json()
  if (!grant_id) return NextResponse.json({ error: 'grant_id required' }, { status: 400 })

  // Upsert — if match already exists just return it
  const { data, error } = await supabase
    .from('grant_matches')
    .upsert(
      {
        user_id: user.id,
        grant_id,
        status: 'new',
        eligibility_score: 0,
        match_reason: 'Manually added to pipeline',
        watch_out: '',
        amount_requested: amount_requested ?? null,
        activity_log: [{ action: 'created', note: 'Added to pipeline', timestamp: new Date().toISOString() }],
      },
      { onConflict: 'user_id,grant_id', ignoreDuplicates: true }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
