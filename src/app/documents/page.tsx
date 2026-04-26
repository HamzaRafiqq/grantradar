import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import DocumentVault from './DocumentVault'

export const metadata: Metadata = {
  title: 'Document Vault — FundsRadar',
  robots: { index: false, follow: false },
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile + org
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, organisation_id')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan ?? 'free'
  const orgId = profile?.organisation_id

  // Fetch org name
  const { data: org } = orgId
    ? await supabase.from('organisations').select('name').eq('id', orgId).single()
    : { data: null }

  // Fetch documents
  const { data: documents } = orgId
    ? await supabase
        .from('documents')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <AppShell orgName={org?.name} plan={plan}>
      <DocumentVault
        initial={documents ?? []}
        plan={plan}
      />
    </AppShell>
  )
}
