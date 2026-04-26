import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FunderShell from '../../FunderShell'
import ApplicationReview from './ApplicationReview'

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: funder } = await supabase
    .from('funder_profiles').select('org_name').eq('id', user.id).maybeSingle()
  if (!funder) redirect('/funder/onboarding')

  // Fetch full application
  const { data: app } = await supabase
    .from('funder_applications')
    .select(`
      id, status, amount_requested, submitted_at, funder_notes,
      grant:funder_grants!inner(id, title, funder_id, max_grant),
      org:organisations(id, name, charity_number, website, location, annual_income, trust_score, nonprofit_type)
    `)
    .eq('id', id)
    .single()

  if (!app) redirect('/funder/applications')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((app.grant as any)?.funder_id !== user.id) redirect('/funder/applications')

  // Fetch answers with questions
  const { data: answers } = await supabase
    .from('funder_application_answers')
    .select('id, answer_text, answer_number, file_path, question:funder_grant_questions(question, type)')
    .eq('application_id', id)

  // Fetch trust score history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (app.org as any)?.id ?? ''
  const { data: trustHistory } = await supabase
    .from('trust_score_history')
    .select('total_score, governance_score, financial_score, document_score, track_record_score, application_score')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <FunderShell orgName={funder.org_name}>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link href="/funder/applications" className="text-gray-400 hover:text-gray-700 transition-colors">
            Applications
          </Link>
          <span className="text-gray-300">/</span>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <span className="text-gray-700 font-medium">{(app.org as any)?.name}</span>
        </div>

        <ApplicationReview
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          application={app as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          answers={(answers ?? []) as any[]}
          trustHistory={trustHistory ?? null}
        />
      </div>
    </FunderShell>
  )
}
