'use client'

import { useState } from 'react'

interface UserSettings {
  name:                 string | null
  email:                string | null
  unitHeight:           string
  unitVelocity:         string
  disclaimerAccepted:   boolean
  disclaimerAcceptedAt: Date | null
  createdAt:            Date
}

export default function SettingsForm({ user }: { user: UserSettings }) {
  const [unitHeight,   setUnitHeight]   = useState(user.unitHeight)
  const [unitVelocity, setUnitVelocity] = useState(user.unitVelocity)
  const [saving,   setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ unitHeight, unitVelocity }),
      })
      setFeedback(res.ok ? 'Settings saved.' : 'Could not save settings.')
    } catch {
      setFeedback('Network error.')
    } finally {
      setSaving(false)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Account</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="label">Name</div>
            <div className="text-gray-700">{user.name ?? '—'}</div>
          </div>
          <div>
            <div className="label">Email</div>
            <div className="text-gray-700">{user.email ?? '—'}</div>
          </div>
          <div>
            <div className="label">Member since</div>
            <div className="text-gray-700">
              {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="label">Disclaimer</div>
            <div className="text-tide-slack font-medium text-sm">
              {user.disclaimerAccepted
                ? `Accepted ${user.disclaimerAcceptedAt
                    ? new Date(user.disclaimerAcceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}`
                : 'Not accepted'}
            </div>
          </div>
        </div>
      </div>

      {/* Display units */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Display units</h2>

        <div>
          <label className="label">Tide height</label>
          <div className="flex gap-2">
            {['ft', 'm'].map(u => (
              <button
                key={u}
                onClick={() => setUnitHeight(u)}
                className={`px-4 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                  unitHeight === u
                    ? 'bg-tide-blue border-tide-blue text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Current velocity</label>
          <div className="flex gap-2 flex-wrap">
            {['kt', 'mph', 'kph', 'm/s'].map(u => (
              <button
                key={u}
                onClick={() => setUnitVelocity(u)}
                className={`px-4 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                  unitVelocity === u
                    ? 'bg-tide-teal border-tide-teal text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
          {feedback && <span className="text-sm text-gray-500">{feedback}</span>}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-red-100">
        <h2 className="font-semibold text-red-700 text-sm mb-2">Data</h2>
        <p className="text-sm text-gray-500 mb-3">
          Export all your dive logs as CSV, or delete your account and all associated data.
        </p>
        <div className="flex gap-2">
          <a href="/api/dive-logs/export" className="btn-secondary text-sm">Export CSV</a>
          <button className="btn-danger text-sm" disabled>Delete account</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Account deletion coming soon — contact support in the meantime.</p>
      </div>
    </div>
  )
}
