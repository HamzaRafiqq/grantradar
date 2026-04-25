'use client'

import { useState } from 'react'
import TrustScore from '@/components/ui/TrustScore'
import type { TrustScores } from '@/lib/trust-score'

interface Props {
  initial: {
    total:        number
    scores:       TrustScores
    improvements: string[]
  }
}

export default function TrustScoreWidget({ initial }: Props) {
  const [data, setData]               = useState(initial)
  const [recalculating, setRecalc]    = useState(false)

  async function handleRecalculate() {
    setRecalc(true)
    try {
      const res = await fetch('/api/trust-score/calculate', { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        setData({
          total:        result.total,
          scores:       result.scores,
          improvements: result.improvements,
        })
      }
    } finally {
      setRecalc(false)
    }
  }

  return (
    <TrustScore
      total={data.total}
      scores={data.scores}
      improvements={data.improvements}
      recalculating={recalculating}
      onRecalculate={handleRecalculate}
    />
  )
}
