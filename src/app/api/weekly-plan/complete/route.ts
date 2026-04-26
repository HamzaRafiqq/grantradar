import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CompleteBody {
  planId: string
  taskKey: string
  completed: boolean
}

// POST /api/weekly-plan/complete
// Toggles task completion for a plan task.
// Body: { planId: string, taskKey: string, completed: boolean }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: CompleteBody
  try {
    body = (await req.json()) as CompleteBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { planId, taskKey, completed } = body
  if (!planId || !taskKey || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify the plan belongs to this user (RLS also enforces this)
  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', user.id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (completed) {
    // Insert completion record (ignore if already exists due to UNIQUE constraint)
    const { error } = await supabase
      .from('weekly_plan_completions')
      .upsert({ plan_id: planId, task_key: taskKey }, { onConflict: 'plan_id,task_key' })

    if (error) {
      console.error('Insert completion error:', error)
      return NextResponse.json({ error: 'Failed to mark complete' }, { status: 500 })
    }
  } else {
    // Delete completion record
    const { error } = await supabase
      .from('weekly_plan_completions')
      .delete()
      .eq('plan_id', planId)
      .eq('task_key', taskKey)

    if (error) {
      console.error('Delete completion error:', error)
      return NextResponse.json({ error: 'Failed to mark incomplete' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
