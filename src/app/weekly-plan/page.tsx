import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import WeeklyPlanClient from './WeeklyPlanClient'
import type { WeeklyPlan } from '@/lib/ai/weekly-plan'
import { getMondayOfWeek } from '@/lib/ai/weekly-plan'

export const metadata: Metadata = {
  title: 'Weekly Plan — FundsRadar',
  robots: { index: false, follow: false },
}

interface WeeklyPlanRow {
  id: string
  user_id: string
  week_start: string
  plan: WeeklyPlan
  created_at: string
}

interface CompletionRow {
  task_key: string
}

export default async function WeeklyPlanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, full_name')
    .eq('id', user.id)
    .single()

  const { data: org } = await supabase
    .from('organisations')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!org) redirect('/onboarding')

  // Determine week_start (Monday of current week, UTC)
  const weekStart = getMondayOfWeek(new Date())

  // Fetch current week's plan
  const { data: weeklyPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  const typedPlan = weeklyPlan as WeeklyPlanRow | null

  // Fetch completions for this plan
  let completedKeys: string[] = []
  if (typedPlan) {
    const { data: completions } = await supabase
      .from('weekly_plan_completions')
      .select('task_key')
      .eq('plan_id', typedPlan.id)

    completedKeys = ((completions ?? []) as CompletionRow[]).map((c) => c.task_key)
  }

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <WeeklyPlanClient
          plan={typedPlan?.plan ?? null}
          planId={typedPlan?.id ?? null}
          weekStart={typedPlan?.week_start ?? weekStart}
          completedKeys={completedKeys}
        />
      </div>
    </AppShell>
  )
}
