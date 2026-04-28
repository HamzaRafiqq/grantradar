'use client'

import { useState } from 'react'

export default function PlanChangeForm({ userId, currentPlan }: { userId: string; currentPlan: string | null }) {
  const [plan, setPlan] = useState(currentPlan ?? 'free')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to update plan')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20"
      >
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="pro">Pro</option>
        <option value="agency">Agency</option>
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-[#0F4C35] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#0a3826] disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {saved && <span className="text-green-600 text-sm">Saved!</span>}
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  )
}
