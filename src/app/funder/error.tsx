'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function FunderError({
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
        <div className="text-5xl mb-4">🏛️</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Funder portal error</h2>
        <p className="text-gray-500 text-sm mb-6">
          Something went wrong in the funder portal. Please try again or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#0F2B4C] text-white font-semibold rounded-xl text-sm hover:bg-[#0a1f38] transition-colors"
          >
            Try again
          </button>
          <Link href="/funder/dashboard" className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
