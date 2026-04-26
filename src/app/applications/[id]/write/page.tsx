import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WriteClient from './WriteClient'

export default async function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, organisation_id')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan ?? 'free'

  // ── Plan gate ─────────────────────────────────────────────────────────────
  if (!['pro', 'agency'].includes(plan)) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0F4C35]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✍️</span>
          </div>
          <h1 className="font-display font-bold text-[#0D1117] text-xl mb-2">AI Application Writer</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Draft compelling grant applications with AI-powered suggestions, live scoring,
            and ⌘K commands — available on Pro and Agency plans.
          </p>
          <ul className="text-left space-y-2 mb-6">
            {[
              'Ghost-text suggestions as you type',
              'Live 0–10 score with improvement tips',
              'CMD+K: Make shorter, Add impact, and more',
              'Full application quality check',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#0F4C35] font-bold">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/pricing"
            className="block w-full bg-[#0F4C35] text-white font-bold text-sm py-3 px-4 rounded-xl hover:bg-[#0c3d2a] transition-colors mb-3"
          >
            Upgrade to Pro →
          </Link>
          <Link href="/pipeline" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Back to Pipeline
          </Link>
        </div>
      </div>
    )
  }

  // ── Fetch the grant match ─────────────────────────────────────────────────
  const { data: matchRaw } = await supabase
    .from('grant_matches')
    .select(`
      id, status, amount_requested,
      grant:grants(id, name, funder_name, description, max_award, deadline)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!matchRaw) redirect('/pipeline')

  // ── Fetch org profile ─────────────────────────────────────────────────────
  const { data: org } = profile?.organisation_id
    ? await supabase
        .from('organisations')
        .select('name, beneficiaries, current_projects, annual_income, sector, location')
        .eq('id', profile.organisation_id)
        .single()
    : { data: null }

  // ── Fetch existing answers ────────────────────────────────────────────────
  const { data: answers } = await supabase
    .from('application_answers')
    .select('question, answer, ai_score')
    .eq('match_id', id)
    .eq('user_id', user.id)

  const charityProfile = {
    name:             org?.name ?? 'Your organisation',
    beneficiaries:    org?.beneficiaries    ?? null,
    current_projects: org?.current_projects ?? null,
    annual_income:    org?.annual_income    ?? null,
    sector:           org?.sector           ?? null,
    location:         org?.location         ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = matchRaw as any

  return (
    <WriteClient
      match={match}
      profile={charityProfile}
      plan={plan}
      initialAnswers={(answers ?? []).map(a => ({
        question: a.question,
        answer:   a.answer,
        ai_score: a.ai_score ?? null,
      }))}
    />
  )
}
