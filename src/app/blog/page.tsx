'use client'

import { useState } from 'react'
import Navbar from '@/components/ui/Navbar'
import { createClient } from '@/lib/supabase/client'

export default function BlogPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    try {
      const supabase = createClient()
      await supabase.from('blog_subscribers').insert({ email })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="mb-6">
          <span className="inline-block bg-[#E8F2ED] text-[#0F4C35] text-xs font-bold px-3 py-1.5 rounded-full mb-6">COMING SOON</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#0D1117] mb-6">
            Grant tips & funding advice for UK charities
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            We&apos;re writing practical guides on finding grants, writing applications, and managing your funding pipeline. Be the first to know when we publish.
          </p>
        </div>

        {/* Topics preview */}
        <div className="grid sm:grid-cols-3 gap-4 my-12 text-left">
          {[
            { icon: '🎯', title: 'Grant matching', desc: "How to find grants you're actually eligible for — without wasting hours on mismatches." },
            { icon: '✍️', title: 'Writing applications', desc: 'What grant-makers really want to see. Common mistakes and how to avoid them.' },
            { icon: '📋', title: 'Pipeline management', desc: 'Tracking deadlines, managing multiple applications, and celebrating wins.' },
          ].map(item => (
            <div key={item.title} className="card text-left">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-[#0D1117] text-sm mb-2">{item.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Email capture */}
        {status === 'done' ? (
          <div className="card py-10">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-semibold text-[#0D1117]">You're on the list!</p>
            <p className="text-gray-400 text-sm mt-1">We'll email you when we publish our first article.</p>
          </div>
        ) : (
          <div className="card py-8">
            <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Get notified when we publish</h2>
            <p className="text-gray-400 text-sm mb-6">No spam. Just useful content for charity fundraising teams.</p>
            <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                className="input flex-1"
                placeholder="your@charity.org.uk"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn-primary text-sm py-2.5 px-5 flex-shrink-0 disabled:opacity-60"
              >
                {status === 'sending' ? 'Saving...' : 'Notify me'}
              </button>
            </form>
            {status === 'error' && (
              <p className="text-red-500 text-xs mt-3">Something went wrong — try again or email hello@fundsradar.co</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
