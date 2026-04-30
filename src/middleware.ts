import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that are NEVER redirected to waitlist
const WAITLIST_BYPASS = [
  '/waitlist',
  '/api/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/admin',
  '/admin-check',
  '/_next',
  '/icon.svg',
]

// Simple in-process cache so we don't hit Supabase on every single request
let cachedWaitlistMode: boolean | null = null
let cacheExpiry = 0
const CACHE_TTL_MS = 30_000 // 30 seconds

async function isWaitlistModeOn(): Promise<boolean> {
  const now = Date.now()
  if (cachedWaitlistMode !== null && now < cacheExpiry) {
    return cachedWaitlistMode
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_settings?key=eq.waitlist_mode&select=value&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json() as Array<{ value: string }>
      const val = data?.[0]?.value === 'true'
      cachedWaitlistMode = val
      cacheExpiry = now + CACHE_TTL_MS
      return val
    }
  } catch {
    // If we can't reach Supabase, don't redirect (fail open)
  }

  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip if Supabase isn't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // Check if this route bypasses the waitlist
  const isBypassed = WAITLIST_BYPASS.some(p => pathname.startsWith(p))

  if (!isBypassed) {
    const waitlistOn = await isWaitlistModeOn()
    if (waitlistOn) {
      const url = request.nextUrl.clone()
      url.pathname = '/waitlist'
      return NextResponse.redirect(url)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
