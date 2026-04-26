'use client'

import { useEffect } from 'react'

export default function DocumentsError({
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
        <div className="text-5xl mb-4">📁</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Document Vault failed to load</h2>
        <p className="text-gray-500 text-sm mb-6">
          We couldn&apos;t load your documents. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#0F4C35] text-white font-semibold rounded-xl text-sm hover:bg-[#0a3828] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
