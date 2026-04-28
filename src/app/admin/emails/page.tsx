'use client'

import { useState } from 'react'

const AUTOMATED_EMAILS = [
  { name: 'Welcome email', description: 'Sent immediately on signup', status: 'active' },
  { name: 'Weekly action plan', description: 'Sent every Monday morning', status: 'active' },
  { name: 'Deadline reminders', description: 'Sent 7 days before grant deadline', status: 'active' },
  { name: 'Grant matching complete', description: 'Sent when AI matching finishes', status: 'active' },
]

export default function AdminEmailsPage() {
  const [segment, setSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleTestSend() {
    setTestSending(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment: 'test', subject, body }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to send test')
      } else {
        setMessage('Test email sent to admin!')
      }
    } catch {
      setError('Network error')
    } finally {
      setTestSending(false)
    }
  }

  async function handleBulkSend() {
    setSending(true)
    setMessage('')
    setError('')
    setShowConfirm(false)
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, subject, body }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to send')
      } else {
        const d = await res.json()
        setMessage(d.message ?? 'Emails queued successfully!')
        setSubject('')
        setBody('')
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  const fieldClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
        <p className="text-gray-500 text-sm mt-1">Send bulk emails and manage automated sequences</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bulk email form */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Send Bulk Email</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Segment</label>
              <select value={segment} onChange={e => setSegment(e.target.value)} className={fieldClass}>
                <option value="all">All users</option>
                <option value="free">Free only</option>
                <option value="paid">Paid only</option>
                <option value="pro">Pro only</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Subject Line</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={fieldClass}
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className={labelClass}>Body (plain text)</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                className={fieldClass}
                placeholder="Email body. Use plain text or basic HTML..."
              />
            </div>

            {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="flex gap-3">
              <button
                onClick={handleTestSend}
                disabled={testSending || !subject || !body}
                className="flex-1 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {testSending ? 'Sending...' : 'Send Test to Admin'}
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!subject || !body}
                className="flex-1 bg-[#0F4C35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3826] disabled:opacity-50 transition-colors"
              >
                Send to Segment
              </button>
            </div>

            {showConfirm && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-3">
                  Are you sure? This will send to <strong>{segment === 'all' ? 'ALL users' : `${segment} users`}</strong>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkSend}
                    disabled={sending}
                    className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Yes, Send Now'}
                  </button>
                  <button onClick={() => setShowConfirm(false)} className="text-gray-600 text-sm hover:underline px-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Automated emails */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Automated Emails</h2>
          <div className="space-y-3">
            {AUTOMATED_EMAILS.map((email) => (
              <div key={email.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{email.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{email.description}</p>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
