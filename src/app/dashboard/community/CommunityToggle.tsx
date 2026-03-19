'use client'

import { useState } from 'react'

export default function CommunityToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled,  setEnabled]  = useState(initialValue)
  const [loading,  setLoading]  = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function toggle() {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/community/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shareLogsWithCommunity: !enabled }),
      })
      if (res.ok) {
        setEnabled(prev => !prev)
        setFeedback(enabled ? 'Sharing disabled.' : 'Sharing enabled — thank you!')
      } else {
        setFeedback('Could not update setting.')
      }
    } catch {
      setFeedback('Network error.')
    } finally {
      setLoading(false)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-tide-slack' : 'bg-gray-200'
        } disabled:opacity-60`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      {feedback && (
        <span className="text-xs text-gray-500">{feedback}</span>
      )}
    </div>
  )
}
