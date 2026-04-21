'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  organisationId: string
  showButton?: boolean
}

export default function DashboardClient({ organisationId, showButton = false }: Props) {
  const router = useRouter()
  const [matching, setMatching] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [message, setMessage] = useState('')

  async function runMatch() {
    setMatching(true)
    setMessage('')
    await fetch('/api/grants/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId }),
    })
    setMatching(false)
    router.refresh()
  }

  async function runDiscover() {
    setDiscovering(true)
    setMessage('Searching the web for grants...')
    const res = await fetch('/api/grants/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId }),
    })
    const data = await res.json()
    if (data.error) {
      setMessage(data.error)
      setDiscovering(false)
      return
    }
    setMessage(`Found ${data.discovered} new grants — running matching...`)
    await fetch('/api/grants/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organisationId }),
    })
    setDiscovering(false)
    setMessage('')
    router.refresh()
  }

  if (showButton) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={runMatch}
          disabled={matching || discovering}
          className="btn-primary px-8 py-3.5 justify-center disabled:opacity-60"
        >
          {matching ? 'Matching...' : 'Find My Grants'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-xs text-gray-400 animate-pulse">{message}</span>
      )}
      <button
        onClick={runDiscover}
        disabled={matching || discovering}
        title="Search the web for new grants"
        className="flex items-center gap-1.5 text-sm border border-[#0F4C35] text-[#0F4C35] px-3 py-2 rounded-lg hover:bg-[#0F4C35] hover:text-white transition-colors disabled:opacity-60"
      >
        {discovering ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="18" strokeDashoffset="6"/>
            </svg>
            Searching...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Discover
          </>
        )}
      </button>
      <button
        onClick={runMatch}
        disabled={matching || discovering}
        className="btn-primary text-sm py-2 disabled:opacity-60"
      >
        {matching ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="18" strokeDashoffset="6"/>
            </svg>
            Matching...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.75"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Find New Grants
          </>
        )}
      </button>
    </div>
  )
}
