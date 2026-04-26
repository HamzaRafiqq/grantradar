'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    href: '/dashboard',
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
    href: '/weekly-plan',
    label: 'Weekly Plan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M2 7h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M6 3V2M12 3V2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M5 11h4M5 14h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M12 10.5l1.5 1.5L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2a5 5 0 015 5v3l1.5 2H2.5L4 10V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M7 14a2 2 0 004 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="4" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="7" y="6" width="4" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
        <rect x="12" y="9" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.75"/>
      </svg>
    ),
  },
  {
    href: '/documents',
    label: 'Documents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M10 2H5a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M6 10h6M6 13h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/pricing',
    label: 'Upgrade',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75"/>
        <path d="M9 2v1.5M9 14.5V16M16 9h-1.5M3.5 9H2M13.6 4.4l-1.06 1.06M5.46 12.54L4.4 13.6M13.6 13.6l-1.06-1.06M5.46 5.46L4.4 4.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function AppShell({ children, orgName, plan }: {
  children: React.ReactNode
  orgName?: string
  plan?: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#0F4C35] min-h-screen fixed left-0 top-0 bottom-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#00C875" strokeWidth="1.75"/>
                <circle cx="8" cy="8" r="2.5" fill="#00C875"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white text-lg">FundsRadar</span>
          </Link>
        </div>

        {/* Org name */}
        {orgName && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Organisation</p>
            <p className="text-white text-sm font-medium truncate">{orgName}</p>
            {plan === 'pro' && (
              <span className="inline-block mt-1 bg-[#00C875] text-[#0D1117] text-xs font-bold px-2 py-0.5 rounded-full">PRO</span>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
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

      {/* Mobile nav — show only core 5 items */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
        <div className="flex">
          {navItems.filter(i => i.href !== '/pricing').map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-[#0F4C35]' : 'text-gray-400'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
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
