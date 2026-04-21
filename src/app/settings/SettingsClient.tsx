'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Organisation, Sector, AnnualIncome } from '@/types'

const sectors = [
  { value: 'animals', label: 'Animals & Wildlife' },
  { value: 'arts', label: 'Arts & Culture' },
  { value: 'children', label: 'Children & Young People' },
  { value: 'disability', label: 'Disability' },
  { value: 'education', label: 'Education & Training' },
  { value: 'elderly', label: 'Elderly & Older People' },
  { value: 'environment', label: 'Environment & Conservation' },
  { value: 'health', label: 'Health & Wellbeing' },
  { value: 'homelessness', label: 'Homelessness & Housing' },
  { value: 'other', label: 'Other / General Community' },
]

const ukRegions = [
  'East Midlands', 'East of England', 'Greater London', 'North East England',
  'North West England', 'Northern Ireland', 'Scotland', 'South East England',
  'South West England', 'Wales', 'West Midlands', 'Yorkshire and the Humber',
]

interface Props {
  profile: Profile | null
  org: Organisation | null
}

export default function SettingsClient({ profile, org }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [orgForm, setOrgForm] = useState({
    name: org?.name ?? '',
    sector: org?.sector ?? '',
    location: org?.location ?? '',
    annual_income: org?.annual_income ?? '',
    registered_charity: org?.registered_charity ?? true,
    charity_number: org?.charity_number ?? '',
    beneficiaries: org?.beneficiaries ?? '',
    current_projects: org?.current_projects ?? '',
  })
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)

  const [cancelLoading, setCancelLoading] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile!.id)
    setProfileSaving(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
    router.refresh()
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault()
    setOrgSaving(true)
    await supabase.from('organisations').update(orgForm).eq('id', org!.id)
    setOrgSaving(false)
    setOrgSaved(true)
    setTimeout(() => setOrgSaved(false), 2000)
    router.refresh()
  }

  async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You\'ll revert to Free at the end of your billing period.')) return
    setCancelLoading(true)
    await supabase.from('profiles').update({ plan: 'free' }).eq('id', profile!.id)
    setCancelLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-4">Your profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email address</label>
            <input className="input" value={profile?.email ?? ''} disabled readOnly className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Contact support if needed.</p>
          </div>
          <button type="submit" disabled={profileSaving} className="btn-primary text-sm py-2.5 disabled:opacity-60">
            {profileSaved ? '✓ Saved' : profileSaving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Organisation */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-4">Organisation details</h2>
        <form onSubmit={saveOrg} className="space-y-4">
          <div>
            <label className="label">Charity name</label>
            <input className="input" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Sector</label>
            <select className="input" value={orgForm.sector} onChange={(e) => setOrgForm({ ...orgForm, sector: e.target.value })}>
              {sectors.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={orgForm.location} onChange={(e) => setOrgForm({ ...orgForm, location: e.target.value })}>
              {ukRegions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Annual income</label>
            <select className="input" value={orgForm.annual_income} onChange={(e) => setOrgForm({ ...orgForm, annual_income: e.target.value })}>
              <option value="under_100k">Under £100,000</option>
              <option value="100k_500k">£100,000 – £500,000</option>
              <option value="over_500k">Over £500,000</option>
            </select>
          </div>
          <div>
            <label className="label">Who do you help?</label>
            <textarea rows={3} className="input resize-none" value={orgForm.beneficiaries} onChange={(e) => setOrgForm({ ...orgForm, beneficiaries: e.target.value })} />
          </div>
          <div>
            <label className="label">Current projects</label>
            <textarea rows={3} className="input resize-none" value={orgForm.current_projects} onChange={(e) => setOrgForm({ ...orgForm, current_projects: e.target.value })} />
          </div>
          <button type="submit" disabled={orgSaving} className="btn-primary text-sm py-2.5 disabled:opacity-60">
            {orgSaved ? '✓ Saved' : orgSaving ? 'Saving...' : 'Save organisation'}
          </button>
        </form>
      </div>

      {/* Billing */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-4">Billing</h2>
        <div className="flex items-center justify-between p-4 bg-[#F4F6F5] rounded-xl mb-4">
          <div>
            <p className="font-medium text-[#0D1117] capitalize">{profile?.plan ?? 'free'} plan</p>
            <p className="text-gray-400 text-sm">
              {profile?.plan === 'pro' ? '£49/month' : 'Free forever'}
            </p>
          </div>
          {profile?.plan === 'pro' && (
            <span className="bg-[#00C875] text-[#0D1117] text-xs font-bold px-2.5 py-1 rounded-full">PRO</span>
          )}
        </div>

        {profile?.plan === 'free' ? (
          <Link href="/pricing" className="btn-primary text-sm py-2.5">
            Upgrade to Pro — £49/mo
          </Link>
        ) : (
          <button
            onClick={cancelSubscription}
            disabled={cancelLoading}
            className="text-red-500 border border-red-200 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {cancelLoading ? 'Cancelling...' : 'Cancel subscription'}
          </button>
        )}
      </div>
    </div>
  )
}
