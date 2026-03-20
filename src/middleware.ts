import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Already heading to onboarding — let it through
    if (pathname.startsWith('/auth/onboarding')) return NextResponse.next()

    // OAuth users who haven't accepted the disclaimer yet
    if (token && !token.disclaimerAccepted) {
      return NextResponse.redirect(new URL('/auth/onboarding', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Only run middleware on authenticated routes
      authorized: ({ token }) => !!token,
    },
  },
)

// Protect everything under /dashboard, /log, /analysis, /community
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/log/:path*',
    '/analysis/:path*',
    '/community/:path*',
    '/planner/:path*',
  ],
}
