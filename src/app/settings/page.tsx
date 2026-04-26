import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = {
  title: 'Settings — FundsRadar',
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: org } = await supabase.from('organisations').select('*').eq('user_id', user.id).single()
  if (!org) redirect('/onboarding')

  return (
    <AppShell orgName={org.name} plan={profile?.plan}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account and organisation</p>
        </div>
        <SettingsClient profile={profile} org={org} />
      </div>
    </AppShell>
  )
}
