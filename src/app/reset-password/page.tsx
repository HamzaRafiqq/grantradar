'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'invalid'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase sends the token via URL hash — the client SDK picks it up automatically
    // If no session established after a moment, the link is invalid/expired
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && !searchParams.get('code')) {
        setStatus('invalid')
      }
    })
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setStatus('error')
    } else {
      setStatus('success')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (status === 'invalid') {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Link expired</h2>
        <p className="text-gray-500 text-sm mb-6">
          This reset link has expired or already been used.
        </p>
        <Link href="/forgot-password" className="btn-primary text-sm py-2.5 px-6 inline-flex">
          Request a new link
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Password updated!</h2>
        <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="At least 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={status === 'loading'}
        />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          required
          className="input"
          placeholder="Repeat your new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          disabled={status === 'loading'}
        />
      </div>

      {(status === 'error' || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error || 'Something went wrong. Please try again.'}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !password || !confirm}
        className="btn-primary w-full justify-center py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
            </svg>
            Updating…
          </>
        ) : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#0F4C35] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#00C875" strokeWidth="2"/>
                <circle cx="9" cy="9" r="3" fill="#00C875"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-[#0F4C35]">FundsRadar</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-[#0D1117]">Set new password</h1>
          <p className="text-gray-500 mt-2 text-sm">Choose a strong password for your account.</p>
        </div>

        <div className="card">
          <Suspense fallback={<div className="animate-pulse h-40 bg-gray-100 rounded-xl" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
