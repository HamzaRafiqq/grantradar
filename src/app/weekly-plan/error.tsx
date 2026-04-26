'use client'
import { useEffect } from 'react'

export default function WeeklyPlanError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="font-display text-xl font-bold text-[#0D1117] mb-2">Couldn't load your plan</h2>
        <p className="text-gray-500 text-sm mb-6">There was a problem loading your weekly plan. Your progress is saved — please try again.</p>
        <button onClick={reset} className="btn-primary text-sm py-2.5 px-6">Try again</button>
      </div>
    </div>
  )
}
