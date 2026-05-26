import { NextRequest, NextResponse } from 'next/server'

// Matches the COOKIE_NAME in src/lib/auth.ts — kept inline to avoid Node.js imports in Edge
const AUTH_COOKIE = 'blind_spot_auth'

const PROTECTED = ['/dashboard', '/study', '/profile', '/onboarding']
const PUBLIC_PREFIXES = ['/_next', '/favicon', '/api/auth', '/api/onboarding/start', '/auth']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Never block public paths
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname === '/') return NextResponse.next()

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname + req.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
