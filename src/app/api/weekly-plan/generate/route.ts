import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyPlan, getMondayOfWeek } from '@/lib/ai/weekly-plan'

// POST /api/weekly-plan/generate
// Two modes:
//   - Authenticated user: generate for themselves (no body needed)
//   - Internal n8n call: { userId, secret } in body, validated against INTERNAL_API_SECRET
export async function POST(req: NextRequest) {
  let userId: string | null = null

  // Try to parse body for internal call
  let body: { userId?: string; secret?: string } = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text) as { userId?: string; secret?: string }
  } catch {
    // No body or invalid JSON — treat as authenticated user call
  }

  if (body.secret && body.userId) {
    // Internal n8n call — validate secret
    if (body.secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    userId = body.userId
  } else {
    // Authenticated user call
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    userId = user.id
  }

  try {
    // Generate the plan
    const plan = await generateWeeklyPlan(userId)

    // Determine week_start (Monday of current week, UTC)
    const weekStart = getMondayOfWeek(new Date())

    // Upsert into weekly_plans
    const supabase = await createClient()
    const { data: saved, error: upsertError } = await supabase
      .from('weekly_plans')
      .upsert(
        { user_id: userId, week_start: weekStart, plan },
        { onConflict: 'user_id,week_start' }
      )
      .select('id')
      .single()

    if (upsertError) {
      console.error('weekly_plans upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, plan, planId: saved?.id })
  } catch (err) {
    console.error('generateWeeklyPlan error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
