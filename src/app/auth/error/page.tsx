'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const MESSAGES: Record<string, string> = {
  Configuration:    'There is a problem with the server configuration.',
  AccessDenied:     'You do not have permission to sign in.',
  Verification:     'The verification link has expired or has already been used.',
  OAuthSignin:      'Could not start the OAuth sign-in flow.',
  OAuthCallback:    'Could not complete the OAuth sign-in.',
  OAuthCreateAccount: 'Could not create an account using OAuth.',
  EmailCreateAccount: 'Could not create an account using this email.',
  Callback:         'Could not complete sign-in.',
  Default:          'An unknown error occurred.',
}

export default function AuthErrorPage() {
  const params = useSearchParams()
  const code   = params.get('error') ?? 'Default'
  const msg    = MESSAGES[code] ?? MESSAGES.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Sign-in error</h1>
        <p className="text-sm text-gray-600">{msg}</p>
        <Link href="/auth/signin" className="btn-primary inline-flex">Back to sign in</Link>
      </div>
    </div>
  )
}
