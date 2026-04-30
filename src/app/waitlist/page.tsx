'use client'

import { useState, useEffect } from 'react'

function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date('2026-06-27T00:00:00Z').getTime()

    function update() {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const units = [
    { label: 'Days', value: time.days },
    { label: 'Hours', value: time.hours },
    { label: 'Minutes', value: time.minutes },
    { label: 'Seconds', value: time.seconds },
  ]

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 my-8">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-3 sm:gap-6">
          <div className="text-center">
            <div
              className="text-4xl sm:text-6xl font-bold tabular-nums leading-none"
              style={{ color: '#00C875', fontFamily: 'Playfair Display, serif' }}
            >
              {String(value).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm text-white/50 mt-2 uppercase tracking-widest font-medium">
              {label}
            </div>
          </div>
          {i < 3 && (
            <div className="text-3xl sm:text-5xl font-bold text-white/20 -mt-4">:</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function WaitlistPage() {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName.trim(), email: email.trim(), organisation: org.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Something went wrong. Please try again.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0F4C35' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#00C875" strokeWidth="1.75"/>
            <circle cx="8" cy="8" r="2.5" fill="#00C875"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 22, color: 'white' }}>
          FundsRadar
        </span>
      </div>

      {/* Badge */}
      <div
        className="text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6"
        style={{ background: 'rgba(0,200,117,0.15)', color: '#00C875', border: '1px solid rgba(0,200,117,0.3)' }}
      >
        Launching June 27th 2026
      </div>

      {/* Headline */}
      <h1
        className="text-center text-3xl sm:text-5xl font-bold text-white leading-tight max-w-2xl mb-4"
        style={{ fontFamily: 'Playfair Display, serif' }}
      >
        UK charities miss billions in grants every year.{' '}
        <span style={{ color: '#00C875' }}>We&apos;re fixing that.</span>
      </h1>

      {/* Subtext */}
      <p className="text-white/60 text-center text-base sm:text-lg max-w-md mb-2" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
        Join the waitlist for{' '}
        <span className="text-white font-semibold">3 months free</span>{' '}
        when we launch.
      </p>

      {/* Countdown */}
      <CountdownTimer />

      {/* Form / Success */}
      <div className="w-full max-w-md">
        {done ? (
          <div
            className="text-center rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              You&apos;re on the list!
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              We&apos;ll email you when we launch.<br />
              <span style={{ color: '#00C875' }} className="font-semibold">Founding members get 3 months free.</span>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-6 sm:p-8 space-y-4"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  First Name <span style={{ color: '#00C875' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Email Address <span style={{ color: '#00C875' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@charity.org.uk"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Organisation <span className="text-white/30 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={org}
                  onChange={e => setOrg(e.target.value)}
                  placeholder="Bright Futures Charity"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-300 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !firstName.trim() || !email.trim()}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#00C875',
                color: '#0F4C35',
                fontFamily: 'Instrument Sans, sans-serif',
              }}
            >
              {loading ? 'Joining...' : 'Join the Waitlist — Free'}
            </button>

            <p className="text-white/30 text-xs text-center">
              No credit card needed. No spam. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="text-white/20 text-xs mt-12 text-center">
        © 2026 FundsRadar · Built for UK charities
      </p>
    </div>
  )
}
