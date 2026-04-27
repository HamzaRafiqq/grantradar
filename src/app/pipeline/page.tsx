import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import PipelineBoard from './PipelineBoard'
import type { GrantMatchWithGrant } from '@/types'

export const metadata: Metadata = {
  title: 'Pipeline — FundsRadar',
  robots: { index: false, follow: false },
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org }     = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const { data: matches } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const plan = profile?.plan ?? 'free'
  const typedMatches = (matches ?? []) as unknown as (GrantMatchWithGrant & {
    amount_requested?: number | null
    activity_log?: object[]
    deadline_set?: string | null
  })[]

  return (
    <AppShell orgName={org.name} plan={plan}>
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0D1117]">Application Pipeline</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Drag cards between stages · Tap any card to edit
          </p>
        </div>
        <PipelineBoard matches={typedMatches} plan={plan} />
      </div>
    </AppShell>
  )
}
