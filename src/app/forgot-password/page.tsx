'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
      setError(err.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
          <h1 className="font-display text-3xl font-bold text-[#0D1117]">Reset your password</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="card">
          {status === 'sent' ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
                It expires in 1 hour.
              </p>
              <p className="text-xs text-gray-400">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={() => setStatus('idle')}
                  className="text-[#0F4C35] font-medium hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input"
                  placeholder="your@charity.org.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error || 'Something went wrong. Please try again.'}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                    </svg>
                    Sending…
                  </>
                ) : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link href="/login" className="text-[#0F4C35] font-medium hover:underline">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
