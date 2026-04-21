'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-[0_2px_16px_rgba(0,0,0,0.10)]' : 'border-b border-gray-100'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0F4C35] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#00C875" strokeWidth="2"/>
              <circle cx="9" cy="9" r="3" fill="#00C875"/>
              <line x1="9" y1="2" x2="9" y2="0" stroke="#00C875" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="16" y1="9" x2="18" y2="9" stroke="#00C875" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl text-[#0F4C35]">GrantRadar</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#how-it-works" className="text-gray-600 hover:text-[#0F4C35] text-sm font-medium transition-colors">
            How it works
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-[#0F4C35] text-sm font-medium transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-[#0F4C35] text-sm font-medium transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2.5 px-5">
            Get Started Free
          </Link>
        </div>

        <button
          className="md:hidden text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/>
                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/>
                <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <Link href="/#how-it-works" className="text-gray-600 text-sm font-medium" onClick={() => setMenuOpen(false)}>How it works</Link>
          <Link href="/pricing" className="text-gray-600 text-sm font-medium" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href="/login" className="text-gray-600 text-sm font-medium" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link href="/signup" className="btn-primary text-sm text-center justify-center w-full" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
        </div>
      )}
    </nav>
  )
}
