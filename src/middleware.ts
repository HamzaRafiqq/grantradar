import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/launch', '/api/launch']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check launch password gate first
  if (process.env.LAUNCH_PASSWORD) {
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
    if (!isPublic) {
      const cookie = request.cookies.get('launch_auth')
      if (cookie?.value !== process.env.LAUNCH_PASSWORD) {
        const url = request.nextUrl.clone()
        url.pathname = '/launch'
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  // Skip Supabase middleware if keys aren't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
