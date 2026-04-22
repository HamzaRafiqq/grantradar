'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PREFS_KEY = 'gr_alert_prefs'

const defaultPrefs = {
  weeklyDigest: true,
  newGrantAlerts: true,
  deadline30: true,
  deadline7: true,
  deadline48: true,
}

type Prefs = typeof defaultPrefs

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const stored = localStorage.getItem(PREFS_KEY)
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs
  } catch {
    return defaultPrefs
  }
}

const prefItems = [
  { key: 'weeklyDigest' as const, label: 'Weekly digest email', desc: 'Every Monday — top 10 new matches for your charity' },
  { key: 'newGrantAlerts' as const, label: 'New grant alerts', desc: 'Immediate email when a new matching grant is found' },
  { key: 'deadline30' as const, label: 'Deadline reminder — 30 days', desc: 'Email when a saved grant is 30 days from closing' },
  { key: 'deadline7' as const, label: 'Deadline reminder — 7 days', desc: 'Email when a saved grant closes in 1 week' },
  { key: 'deadline48' as const, label: 'Deadline reminder — 48 hours', desc: 'Urgent email 48 hours before a grant closes' },
]

export default function AlertPreferences() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof Prefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  async function save() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    const supabase = createClient()
    await supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').update({ alert_preferences: prefs } as never).eq('id', user.id)
      }
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold text-[#0D1117] mb-1">Alert Preferences</h2>
      <p className="text-gray-400 text-sm mb-5">Choose which emails you receive from FundsRadar</p>
      <div className="space-y-4">
        {prefItems.map(item => (
          <div key={item.key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#0D1117]">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none ${prefs[item.key] ? 'bg-[#0F4C35]' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={prefs[item.key]}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${prefs[item.key] ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-6 btn-primary text-sm py-2.5 w-full justify-center"
      >
        {saved ? '✓ Preferences saved' : 'Save preferences'}
      </button>
    </div>
  )
}
