import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PlanChangeForm from './PlanChangeForm'

export const metadata = { title: 'User Detail — Admin' }

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-3 border-b border-gray-100 last:border-0">
      <span className="w-40 text-xs font-medium text-gray-500 uppercase shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</span>
    </div>
  )
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const [
    { data: profile },
    { data: org },
    { data: trustHistory },
    { count: pipelineCount },
    { count: documentsCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('organisations').select('*').eq('user_id', id).single(),
    supabase.from('trust_score_history').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.from('pipeline_items').select('*', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', id),
  ])

  if (!profile) notFound()

  const latestTrust = trustHistory?.[0]

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">← Back to Users</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{profile.email}</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Profile info */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="User ID" value={<span className="font-mono text-xs">{profile.id}</span>} />
          <InfoRow label="Plan" value={
            <div>
              <span className="text-gray-700 capitalize">{profile.plan ?? 'free'}</span>
              <PlanChangeForm userId={profile.id} currentPlan={profile.plan} />
            </div>
          } />
          <InfoRow label="Stripe ID" value={profile.stripe_customer_id ? <span className="font-mono text-xs">{profile.stripe_customer_id}</span> : null} />
          <InfoRow label="Signed Up" value={new Date(profile.created_at).toLocaleString('en-GB')} />
        </div>

        {/* Organisation info */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Organisation</h2>
          {org ? (
            <>
              <InfoRow label="Name" value={org.name} />
              <InfoRow label="Charity No." value={org.charity_number} />
              <InfoRow label="Sector" value={org.sector} />
              <InfoRow label="Location" value={org.location} />
              <InfoRow label="Country" value={org.country} />
              <InfoRow label="Annual Income" value={org.annual_income ? `£${Number(org.annual_income).toLocaleString()}` : null} />
            </>
          ) : (
            <p className="text-gray-400 text-sm">No organisation linked</p>
          )}
        </div>

        {/* Activity stats */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Activity</h2>
          <InfoRow label="Pipeline Items" value={pipelineCount ?? 0} />
          <InfoRow label="Documents" value={documentsCount ?? 0} />
        </div>

        {/* Trust score */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Trust Score</h2>
          {latestTrust ? (
            <>
              <div className="text-3xl font-bold text-[#0F4C35] mb-4">{latestTrust.total_score ?? '—'}<span className="text-base font-normal text-gray-400">/100</span></div>
              <InfoRow label="Calculated" value={new Date(latestTrust.created_at).toLocaleDateString('en-GB')} />
              {latestTrust.breakdown && typeof latestTrust.breakdown === 'object' && Object.entries(latestTrust.breakdown as Record<string, unknown>).map(([k, v]) => (
                <InfoRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} />
              ))}
            </>
          ) : (
            <p className="text-gray-400 text-sm">No trust score calculated yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
