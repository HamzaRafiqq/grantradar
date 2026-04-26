'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Dashboard failed to load</h2>
        <p className="text-gray-500 text-sm mb-6">
          We couldn&apos;t load your dashboard. This might be a temporary issue — please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#0F4C35] text-white font-semibold rounded-xl text-sm hover:bg-[#0a3828] transition-colors"
          >
            Try again
          </button>
          <Link href="/login" className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
