import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/applications/[id] — update status, notes, amount_requested
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, notes, amount_requested, deadline_set } = body

  // Fetch current record (needed for activity log append)
  const { data: current } = await supabase
    .from('grant_matches')
    .select('status, activity_log')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Build activity log entry if status changed
  const activityLog: object[] = Array.isArray(current.activity_log) ? current.activity_log : []
  if (status && status !== current.status) {
    activityLog.push({
      action: 'status_changed',
      from: current.status,
      to: status,
      timestamp: new Date().toISOString(),
    })
  }

  const updates: Record<string, unknown> = { activity_log: activityLog }
  if (status !== undefined)           updates.status = status
  if (notes !== undefined)            updates.notes = notes
  if (amount_requested !== undefined) updates.amount_requested = amount_requested
  if (deadline_set !== undefined)     updates.deadline_set = deadline_set

  const { data, error } = await supabase
    .from('grant_matches')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/applications/[id] — remove from pipeline
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('grant_matches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
