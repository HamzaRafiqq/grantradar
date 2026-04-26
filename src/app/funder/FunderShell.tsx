'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    href: '/funder/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      </svg>
    ),
  },
  {
    href: '/funder/grants',
    label: 'My Grants',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M6 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/funder/applications',
    label: 'Applications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L11 6H15L12 9L13 13L9 11L5 13L6 9L3 6H7L9 2Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/funder/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M3 16c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function FunderShell({
  children,
  orgName,
}: {
  children: React.ReactNode
  orgName?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0F2B4C] min-h-screen fixed left-0 top-0 bottom-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/funder/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#60A5FA" strokeWidth="1.75"/>
                <circle cx="8" cy="8" r="2.5" fill="#60A5FA"/>
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-white text-base leading-none">FundsRadar</span>
              <span className="block text-[10px] text-blue-300 font-medium leading-none mt-0.5">Funder Portal</span>
            </div>
          </Link>
        </div>

        {/* Org name */}
        {orgName && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Organisation</p>
            <p className="text-white text-sm font-medium truncate">{orgName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors w-full"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 16H4a1 1 0 01-1-1V3a1 1 0 011-1h3M12 13l4-4-4-4M16 9H7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F2B4C] z-50">
        <div className="flex">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active ? 'text-white' : 'text-white/50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
