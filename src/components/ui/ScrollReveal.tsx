'use client'

import { useEffect, useRef } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
  /** Delay in milliseconds before the reveal animation plays */
  delay?: number
}

export default function ScrollReveal({ children, className = '', delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (delay) el.style.transitionDelay = `${delay}ms`

    // If already in viewport on mount, reveal immediately
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.95) {
      // Small timeout so the initial paint is visible before animating
      const t = setTimeout(() => el.classList.add('reveal-visible'), 60)
      return () => clearTimeout(t)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}
