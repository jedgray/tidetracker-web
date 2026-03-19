'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISCLAIMER_SECTIONS, DISCLAIMER_ACCEPTANCE_LABEL } from '@/lib/disclaimer'

export default function SignUpPage() {
  const router = useRouter()
  const [name,               setName]               = useState('')
  const [email,              setEmail]              = useState('')
  const [password,           setPassword]           = useState('')
  const [confirmPassword,    setConfirmPassword]    = useState('')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [loading,            setLoading]            = useState(false)
  const [error,              setError]              = useState<string | null>(null)
  const [step,               setStep]               = useState<'details' | 'disclaimer'>('details')

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError(null)
    setStep('disclaimer')
  }

  async function handleRegister() {
    if (!disclaimerAccepted) {
      setError('You must accept the disclaimer to create an account.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, disclaimerAccepted: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
        setLoading(false)
        return
      }
      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email, password, redirect: false, callbackUrl: '/dashboard',
      })
      if (result?.error) {
        setError('Account created but sign-in failed — please sign in manually.')
        router.push('/auth/signin')
      } else {
        router.push('/dashboard')
      }
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
            <WaveIcon />
          </div>
          <h1 className="text-xl font-bold text-gray-900">TideTracker</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        {step === 'details' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Account details</h2>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleDetailsSubmit} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" type="text" required value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="input" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn-primary w-full mt-1">
                Continue to disclaimer →
              </button>
            </form>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-tide-blue font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {step === 'disclaimer' && (
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('details')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
              <h2 className="text-base font-semibold text-gray-800">Safety &amp; liability disclaimer</h2>
            </div>

            <p className="text-xs text-gray-500">
              Please read this disclaimer carefully before creating your account. Scroll through the full document before accepting.
            </p>

            {/* Scrollable disclaimer body */}
            <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-80 bg-gray-50 px-4 py-4 space-y-4 text-sm text-gray-700 leading-relaxed">
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

            {/* Acceptance checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-tide-blue focus:ring-tide-blue flex-shrink-0"
                checked={disclaimerAccepted}
                onChange={e => setDisclaimerAccepted(e.target.checked)}
              />
              <span className="text-sm text-gray-700 leading-snug">
                {DISCLAIMER_ACCEPTANCE_LABEL}
              </span>
            </label>

            <button
              onClick={handleRegister}
              disabled={loading || !disclaimerAccepted}
              className="btn-primary w-full"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
      <path d="M2 7c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
      <path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
    </svg>
  )
}
