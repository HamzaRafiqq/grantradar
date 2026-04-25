import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateTrustScore } from '@/lib/trust-score'

// POST /api/trust-score/calculate
// Recalculates trust score for the authenticated user's organisation
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  try {
    const result = await calculateTrustScore(org.id, supabase)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
