'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LaunchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirect = searchParams.get('from') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/launch/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(redirect)
      router.refresh()
    } else {
      setError('Incorrect password. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0F4C35' }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="14" stroke="#00C875" strokeWidth="2.5"/>
            <circle cx="18" cy="18" r="6" fill="#00C875"/>
            <line x1="18" y1="2" x2="18" y2="5" stroke="#00C875" strokeWidth="2" strokeLinecap="round"/>
            <line x1="34" y1="18" x2="31" y2="18" stroke="#00C875" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-white font-bold text-3xl tracking-tight">FundsRadar</h1>
        <p className="text-white/60 text-sm mt-1">Coming soon</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <h2 className="text-[#0D1117] font-semibold text-lg mb-1">Early access</h2>
        <p className="text-gray-400 text-sm mb-6">Enter the password to preview FundsRadar.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
              required
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F4C35] text-white font-semibold py-3 rounded-xl text-sm hover:bg-[#0c3d2a] transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Enter →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Interested in early access?{' '}
          <a href="mailto:hello@fundsradar.co" className="text-[#0F4C35] hover:underline font-medium">
            Get in touch
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LaunchPage() {
  return (
    <Suspense>
      <LaunchForm />
    </Suspense>
  )
}
