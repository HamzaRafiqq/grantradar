'use client'

import { useState } from 'react'

export default function DeadlinesEmailForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'deadlines_page' }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Something went wrong — please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Something went wrong — please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white/10 rounded-2xl px-6 py-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-white font-semibold text-lg">You&apos;re on the list!</p>
        <p className="text-white/60 text-sm mt-1">We&apos;ll send you grant alerts that match your charity.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        placeholder="your@charity.org.uk"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-4 py-3 rounded-xl text-[#0D1117] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00C875] placeholder:text-gray-400"
        disabled={status === 'loading'}
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="bg-[#00C875] text-[#0D1117] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#00b368] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {status === 'loading' ? 'Subscribing…' : 'Get Grant Alerts →'}
      </button>
      {status === 'error' && (
        <p className="text-red-300 text-xs mt-2 sm:col-span-2">{errorMsg}</p>
      )}
    </form>
  )
}
