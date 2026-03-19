import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Already heading to onboarding — let it through
    if (pathname.startsWith('/auth/onboarding')) return NextResponse.next()

    // Check disclaimer from token — the jwt callback now always
    // fetches this fresh from DB when it's false
    if (token && !token.disclaimerAccepted) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/onboarding'
      // Add a cache-busting param to prevent browser caching the redirect
      url.searchParams.set('t', Date.now().toString())
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/log/:path*',
    '/analysis/:path*',
    '/community/:path*',
  ],
}