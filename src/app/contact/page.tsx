'use client'

import { useState } from 'react'
import Navbar from '@/components/ui/Navbar'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', charity: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-[#0D1117] mb-4">Get in touch</h1>
          <p className="text-gray-500 text-lg">Questions about FundsRadar? We reply within 24 hours, wherever you are.</p>
          <a href="mailto:hello@fundsradar.co" className="inline-flex items-center gap-2 text-[#0F4C35] font-medium mt-3 hover:underline text-sm">
            📧 hello@fundsradar.co
          </a>
        </div>

        {status === 'done' ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-2">Message sent!</h2>
            <p className="text-gray-500">We'll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="label">Your name</label>
              <input
                required
                className="input"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                required
                type="email"
                className="input"
                placeholder="jane@yourcharity.org.uk"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Charity name</label>
              <input
                className="input"
                placeholder="Your charity (optional)"
                value={form.charity}
                onChange={e => setForm(f => ({ ...f, charity: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                required
                rows={5}
                className="input resize-none"
                placeholder="How can we help?"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm">Something went wrong — please email us directly at hello@fundsradar.co</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-primary w-full justify-center py-3.5 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
