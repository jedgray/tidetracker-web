'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DISCLAIMER_SECTIONS, DISCLAIMER_ACCEPTANCE_LABEL } from '@/lib/disclaimer'

export default function OnboardingPage() {
  const router              = useRouter()
  const { update }          = useSession()
  const [accepted, setAccepted] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleAccept() {
    if (!accepted) { setError('You must accept the disclaimer to continue.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/accept-disclaimer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ accepted: true }),
      })
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      // Dashboard layout checks DB directly so no token refresh needed
      window.location.href = '/dashboard'
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-tide-blue mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
              <path d="M2 7c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
              <path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">One more step</h1>
          <p className="text-sm text-gray-500 mt-1">Please read and accept the disclaimer before using TideTracker</p>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Safety &amp; liability disclaimer</h2>

          <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-96 bg-gray-50 px-4 py-4 space-y-4 text-sm text-gray-700 leading-relaxed">
            {DISCLAIMER_SECTIONS.map((section, i) => (
              <div key={i}>
                <h3 className="font-semibold text-gray-900 mb-1">{section.heading}</h3>
                <p>{section.body}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-tide-blue focus:ring-tide-blue flex-shrink-0"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
            />
            <span className="text-sm text-gray-700 leading-snug">{DISCLAIMER_ACCEPTANCE_LABEL}</span>
          </label>

          <button
            onClick={handleAccept}
            disabled={loading || !accepted}
            className="btn-primary w-full"
          >
            {loading ? 'Saving…' : 'Accept and continue'}
          </button>
        </div>
      </div>
    </div>
  )
}