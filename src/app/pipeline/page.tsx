import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import PipelineBoard from './PipelineBoard'
import type { GrantMatchWithGrant } from '@/types'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  const isPro = profile?.plan === 'pro'

  const { data: matches } = await supabase
    .from('grant_matches')
    .select('*, grant:grants(*)')
    .eq('user_id', user.id)

  const typedMatches = (matches ?? []) as unknown as GrantMatchWithGrant[]

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Application Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">Drag grants between columns to track your progress</p>
        </div>
        <PipelineBoard matches={typedMatches} isPro={isPro} />
      </div>
    </AppShell>
  )
}
