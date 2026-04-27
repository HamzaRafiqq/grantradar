'use client'

import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface Props {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  /** Custom formatter — receives the current animated integer value */
  formatFn?: (n: number) => string
  className?: string
}

export default function CountUp({
  end,
  duration = 1800,
  prefix = '',
  suffix = '',
  formatFn,
  className,
}: Props) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Trigger when element enters viewport
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Run animation
  useEffect(() => {
    if (!started) return
    const startTime = performance.now()
    let raf: number

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(end * easeOutCubic(progress)))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, end, duration])

  const display = formatFn ? formatFn(count) : count.toLocaleString('en-GB')

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  )
}
