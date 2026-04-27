import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FunderShell from '../FunderShell'
import FunderProfileForm from './FunderProfileForm'

export default async function FunderProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('funder_profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) redirect('/funder/onboarding')

  return (
    <FunderShell orgName={profile.org_name}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="font-display font-bold text-[#0D1117] text-xl sm:text-2xl mb-6">Funder Profile</h1>
        <FunderProfileForm profile={profile} />
      </div>
    </FunderShell>
  )
}
