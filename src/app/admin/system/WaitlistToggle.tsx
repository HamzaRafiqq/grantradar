'use client'

import { useState } from 'react'

export default function WaitlistToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle() {
    const next = !enabled
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'waitlist_mode', value: next ? 'true' : 'false' }),
      })
      if (res.ok) {
        setEnabled(next)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Waitlist Mode</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {enabled
              ? '🔴 All visitors are being redirected to /waitlist'
              : '🟢 Site is live — visitors see the normal website'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {saved && <span className="text-green-600 text-sm font-medium">Saved ✓</span>}
          <button
            onClick={toggle}
            disabled={loading}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
              enabled ? 'bg-red-500' : 'bg-[#0F4C35]'
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-bold w-8 ${enabled ? 'text-red-500' : 'text-[#0F4C35]'}`}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${enabled ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
        {enabled ? (
          <>
            <strong>Waitlist mode is ON.</strong> Every page (except /api, /login, /dashboard, /admin) redirects to <strong>/waitlist</strong>.
            Toggle OFF to restore normal access.
          </>
        ) : (
          <>
            <strong>Site is fully live.</strong> Toggle ON to redirect all public visitors to the waitlist page.
            Admins, logged-in users, and API calls are never affected.
          </>
        )}
      </div>
    </div>
  )
}
