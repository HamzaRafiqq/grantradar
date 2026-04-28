'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GrantFormData {
  name: string
  public_title: string
  funder: string
  funder_type: string
  description: string
  public_description: string
  eligibility_criteria: string
  min_award: string
  max_award: string
  deadline: string
  open_date: string
  sectors: string
  locations: string
  application_url: string
  funder_website: string
  source: string
  is_active: boolean
  country: string
}

const defaultForm: GrantFormData = {
  name: '',
  public_title: '',
  funder: '',
  funder_type: '',
  description: '',
  public_description: '',
  eligibility_criteria: '',
  min_award: '',
  max_award: '',
  deadline: '',
  open_date: '',
  sectors: '',
  locations: '',
  application_url: '',
  funder_website: '',
  source: 'manual',
  is_active: true,
  country: 'GB',
}

export default function GrantForm({ initialData, grantId }: { initialData?: Partial<GrantFormData & { id: string; sectors?: string[] | string; locations?: string[] | string }>; grantId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<GrantFormData>({
    ...defaultForm,
    ...initialData,
    sectors: Array.isArray(initialData?.sectors) ? initialData.sectors.join(', ') : (initialData?.sectors ?? ''),
    locations: Array.isArray(initialData?.locations) ? initialData.locations.join(', ') : (initialData?.locations ?? ''),
    min_award: initialData?.min_award ? String(initialData.min_award) : '',
    max_award: initialData?.max_award ? String(initialData.max_award) : '',
    deadline: initialData?.deadline ? initialData.deadline.split('T')[0] : '',
    open_date: initialData?.open_date ? initialData.open_date.split('T')[0] : '',
    is_active: initialData?.is_active !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!grantId

  function set(field: keyof GrantFormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        min_award: form.min_award ? Number(form.min_award) : null,
        max_award: form.max_award ? Number(form.max_award) : null,
        deadline: form.deadline || null,
        open_date: form.open_date || null,
        sectors: form.sectors ? form.sectors.split(',').map(s => s.trim()).filter(Boolean) : [],
        locations: form.locations ? form.locations.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      const url = isEdit ? `/api/admin/grants/${grantId}` : '/api/admin/grants'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save grant')
      } else {
        router.push('/admin/grants')
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!grantId) return
    if (!confirm('Delete this grant? This cannot be undone.')) return
    try {
      await fetch(`/api/admin/grants/${grantId}`, { method: 'DELETE' })
      router.push('/admin/grants')
      router.refresh()
    } catch {
      setError('Failed to delete')
    }
  }

  const fieldClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Basic Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass} placeholder="Grant name" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Public Title</label>
            <input value={form.public_title} onChange={e => set('public_title', e.target.value)} className={fieldClass} placeholder="Shorter public-facing title" />
          </div>
          <div>
            <label className={labelClass}>Funder</label>
            <input value={form.funder} onChange={e => set('funder', e.target.value)} className={fieldClass} placeholder="e.g. National Lottery" />
          </div>
          <div>
            <label className={labelClass}>Funder Type</label>
            <input value={form.funder_type} onChange={e => set('funder_type', e.target.value)} className={fieldClass} placeholder="e.g. Lottery, Foundation" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Description</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Internal Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className={fieldClass} rows={3} placeholder="Detailed description for matching" />
          </div>
          <div>
            <label className={labelClass}>Public Description</label>
            <textarea value={form.public_description} onChange={e => set('public_description', e.target.value)} className={fieldClass} rows={3} placeholder="Shown to users" />
          </div>
          <div>
            <label className={labelClass}>Eligibility Criteria</label>
            <textarea value={form.eligibility_criteria} onChange={e => set('eligibility_criteria', e.target.value)} className={fieldClass} rows={3} placeholder="Who can apply" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Award & Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Min Award (£)</label>
            <input type="number" value={form.min_award} onChange={e => set('min_award', e.target.value)} className={fieldClass} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Max Award (£)</label>
            <input type="number" value={form.max_award} onChange={e => set('max_award', e.target.value)} className={fieldClass} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Open Date</label>
            <input type="date" value={form.open_date} onChange={e => set('open_date', e.target.value)} className={fieldClass} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Targeting</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Sectors (comma-separated)</label>
            <input value={form.sectors} onChange={e => set('sectors', e.target.value)} className={fieldClass} placeholder="e.g. Education, Health, Arts" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Locations (comma-separated)</label>
            <input value={form.locations} onChange={e => set('locations', e.target.value)} className={fieldClass} placeholder="e.g. England, Scotland, UK-wide" />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} className={fieldClass} placeholder="GB" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Links & Meta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Application URL</label>
            <input type="url" value={form.application_url} onChange={e => set('application_url', e.target.value)} className={fieldClass} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Funder Website</label>
            <input type="url" value={form.funder_website} onChange={e => set('funder_website', e.target.value)} className={fieldClass} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <input value={form.source} onChange={e => set('source', e.target.value)} className={fieldClass} placeholder="manual" />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded accent-[#0F4C35]"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to users)</label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#0F4C35] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0a3826] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Grant'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete Grant
          </button>
        )}
      </div>
    </form>
  )
}
