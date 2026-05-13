'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AccountType = 'charity' | 'funder'

export default function SignupPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<AccountType>('charity')
  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const redirectTo = accountType === 'funder'
      ? `${window.location.origin}/funder/onboarding`
      : `${window.location.origin}/onboarding`

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, account_type: accountType },
        emailRedirectTo: redirectTo,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push(accountType === 'funder' ? '/funder/onboarding' : '/onboarding')
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
          <h1 className="font-display text-3xl font-bold text-[#0D1117]">Create your account</h1>
          <p className="text-gray-500 mt-2 text-sm">Join UK charities already finding grants with FundsRadar.</p>
        </div>

        <div className="card">
          {/* Account type toggle */}
          <div className="mb-6">
            <label className="label mb-2 block">I am a…</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              {([
                { value: 'charity', label: '🏛️ Registered Charity', desc: 'Find and apply for grants' },
                { value: 'funder',  label: '💰 Grant-making Funder', desc: 'Post grants and review applications' },
              ] as { value: AccountType; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccountType(opt.value)}
                  className={`flex flex-col items-center text-center p-3 rounded-lg transition-all text-xs font-medium ${
                    accountType === opt.value
                      ? 'bg-white shadow-sm text-[#0D1117]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-base mb-0.5">{opt.label.split(' ')[0]}</span>
                  <span>{opt.label.slice(2)}</span>
                  <span className={`text-[10px] mt-0.5 ${accountType === opt.value ? 'text-gray-400' : 'text-gray-400'}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="label">Full name</label>
              <input
                id="fullName"
                type="text"
                required
                className="input"
                placeholder={accountType === 'funder' ? 'James Harrison' : 'Sarah Mitchell'}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">Work email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                placeholder={accountType === 'funder' ? 'james@yourfoundation.org' : 'sarah@yourcharity.org.uk'}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className="input"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8"/>
                  </svg>
                  Creating account…
                </>
              ) : accountType === 'funder' ? (
                'Create funder account →'
              ) : (
                "Create account — it's free"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0F4C35] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
