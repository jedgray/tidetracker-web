'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SITES = [
  { id: 'edmonds',   name: 'Edmonds Underwater Park', currStationId: 'PUG1503', currStationName: 'Agate Passage',    tideStationId: '9447214', tideStationName: 'Shilshole Bay' },
  { id: 'mukilteo',  name: 'Mukilteo T-Dock',         currStationId: 'PUG1503', currStationName: 'Agate Passage',    tideStationId: '9447359', tideStationName: 'Everett'       },
  { id: 'keystone',  name: 'Keystone Jetty',          currStationId: 'PCT1516', currStationName: 'Admiralty Inlet',  tideStationId: '9447110', tideStationName: 'Port Townsend' },
  { id: 'alki2',     name: 'Alki Cove 2',             currStationId: 'PUG1501', currStationName: 'Rich Passage',     tideStationId: '9447130', tideStationName: 'Seattle'       },
  { id: 'alkijunk',  name: 'Alki Junkyard',           currStationId: 'PUG1501', currStationName: 'Rich Passage',     tideStationId: '9447130', tideStationName: 'Seattle'       },
  { id: 'threetree', name: 'Three Tree Point',        currStationId: 'PUG1501', currStationName: 'Rich Passage',     tideStationId: '9447130', tideStationName: 'Seattle'       },
  { id: 'redondo',   name: 'Redondo Fishing Pier',    currStationId: 'PUG1501', currStationName: 'Rich Passage',     tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'saltwater', name: 'Saltwater State Park',    currStationId: 'PUG1501', currStationName: 'Rich Passage',     tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'sunnyside', name: 'Sunnyside Beach',         currStationId: 'PUG1511', currStationName: 'Colvos Passage',   tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'sunrise',   name: 'Sunrise Beach',           currStationId: 'PUG1511', currStationName: 'Colvos Passage',   tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'dayisland', name: 'Day Island Wall',         currStationId: 'PUG1515', currStationName: 'The Narrows',      tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'foxisland', name: 'Fox Island Wall',         currStationId: 'PUG1511', currStationName: 'Colvos Passage',   tideStationId: '9446807', tideStationName: 'Tacoma'        },
  { id: 'saltcreek', name: 'Salt Creek',              currStationId: 'PCT1516', currStationName: 'Admiralty Inlet',  tideStationId: '9443090', tideStationName: 'Neah Bay'      },
  { id: 'sekiu',     name: 'Sekiu',                   currStationId: 'PCT1516', currStationName: 'Admiralty Inlet',  tideStationId: '9443090', tideStationName: 'Neah Bay'      },
]

const CURR_STRENGTH = ['None', 'Mild', 'Moderate', 'Strong', 'Dangerous']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function DiveLogForm({
  unitHeight,
  unitVelocity,
}: {
  unitHeight:   string
  unitVelocity: string
}) {
  const router = useRouter()

  const [siteId,         setSiteId]         = useState('')
  const [date,           setDate]           = useState(todayISO())
  const [entryTime,      setEntryTime]      = useState('')
  const [exitTime,       setExitTime]       = useState('')
  const [maxDepth,       setMaxDepth]       = useState('')
  const [plannedSlack,   setPlannedSlack]   = useState('')
  const [observedSlack,  setObservedSlack]  = useState('')
  const [visibilityFt,   setVisibilityFt]   = useState('')
  const [waterTempF,     setWaterTempF]     = useState('')
  const [currStrength,   setCurrStrength]   = useState(1)
  const [conditions,     setConditions]     = useState('')
  const [rating,         setRating]         = useState(0)
  const [notes,          setNotes]          = useState('')
  const [shareWithComm,  setShareWithComm]  = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const site = SITES.find(s => s.id === siteId)

  const delta = plannedSlack && observedSlack
    ? toMins(observedSlack) - toMins(plannedSlack)
    : null

  function deltaDisplay() {
    if (delta === null) return null
    const abs = Math.abs(delta)
    const h = Math.floor(abs / 60), m = abs % 60
    const str = h > 0 ? `${h}h ${m}m` : `${m}m`
    if (Math.abs(delta) < 5) return { text: 'On time', cls: 'text-tide-slack' }
    return delta < 0
      ? { text: `${str} early`, cls: 'text-tide-teal' }
      : { text: `${str} late`,  cls: 'text-tide-amber' }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!siteId || !date) { setError('Site and date are required.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dive-logs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          siteId,
          siteName:             site?.name ?? '',
          region:               '',
          diveDate:             date,
          entryTime:            entryTime  || null,
          exitTime:             exitTime   || null,
          maxDepthFt:           maxDepth   ? parseInt(maxDepth)   : null,
          plannedSlack:         plannedSlack  || null,
          observedSlack:        observedSlack || null,
          deltaMinutes:         delta,
          currStationId:        site?.currStationId   ?? null,
          currStationName:      site?.currStationName ?? null,
          tideStationId:        site?.tideStationId   ?? null,
          tideStationName:      site?.tideStationName ?? null,
          visibilityFt:         visibilityFt ? parseInt(visibilityFt) : null,
          waterTempF:           waterTempF   ? parseInt(waterTempF)   : null,
          currentStrength:      currStrength,
          currentStrengthLabel: CURR_STRENGTH[currStrength],
          conditions:           conditions  || null,
          rating:               rating > 0 ? rating : null,
          notes:                notes.trim() || null,
          sharedWithCommunity:  shareWithComm,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); setLoading(false); return }
      router.push('/dashboard/history')
    } catch {
      setError('Network error.')
      setLoading(false)
    }
  }

  const dd = deltaDisplay()

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Site + date */}
      <div className="card p-5 space-y-4">
        <div className="section-head">Dive details</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Site</label>
            <select className="input" value={siteId} onChange={e => setSiteId(e.target.value)} required>
              <option value="">— select site —</option>
              {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Max depth ({unitHeight === 'm' ? 'm' : 'ft'})</label>
            <input className="input" type="number" min="0" max="300" placeholder="e.g. 60" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} />
          </div>
          <div>
            <label className="label">Entry time</label>
            <input className="input" type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Exit time</label>
            <input className="input" type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} />
          </div>
        </div>
        {site && (
          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            <span>Current: <span className="text-tide-teal font-semibold">{site.currStationName}</span></span>
            <span>Tide: <span className="text-tide-blue-dk font-semibold">{site.tideStationName}</span></span>
          </div>
        )}
      </div>

      {/* Slack observation */}
      <div className="card p-5 space-y-4">
        <div className="section-head">Slack water observation</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Planned slack</label>
            <input className="input" type="time" value={plannedSlack} onChange={e => setPlannedSlack(e.target.value)} />
            <div className="text-xs text-gray-400 mt-1">From prediction</div>
          </div>
          <div>
            <label className="label">Observed slack</label>
            <input className="input" type="time" value={observedSlack} onChange={e => setObservedSlack(e.target.value)} />
            <div className="text-xs text-gray-400 mt-1">What you saw</div>
          </div>
        </div>
        {dd && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className={`text-lg font-bold font-mono ${dd.cls}`}>
              {delta !== null && Math.abs(delta) >= 5 ? (delta < 0 ? '−' : '+') : '±'}
              {delta !== null && Math.abs(delta) >= 5 ? (() => { const abs = Math.abs(delta); const h = Math.floor(abs/60), m = abs%60; return h > 0 ? `${h}h ${m}m` : `${m}m` })() : '0'}
            </span>
            <div>
              <div className={`font-semibold text-sm ${dd.cls}`}>{dd.text}</div>
              <div className="text-xs text-gray-400">Contributes to site correction data</div>
            </div>
          </div>
        )}
      </div>

      {/* Observed conditions */}
      <div className="card p-5 space-y-4">
        <div className="section-head">Observed conditions</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Visibility (ft)</label>
            <input className="input" type="number" min="0" max="200" placeholder="e.g. 25" value={visibilityFt} onChange={e => setVisibilityFt(e.target.value)} />
          </div>
          <div>
            <label className="label">Water temp (°F)</label>
            <input className="input" type="number" min="28" max="80" placeholder="e.g. 48" value={waterTempF} onChange={e => setWaterTempF(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Conditions vs plan</label>
          <select className="input" value={conditions} onChange={e => setConditions(e.target.value)}>
            <option value="">— select —</option>
            <option value="better">Better than predicted</option>
            <option value="as-predicted">As predicted</option>
            <option value="worse">Worse than predicted</option>
            <option value="no-plan">No prediction to compare</option>
          </select>
        </div>
        <div>
          <label className="label">Current strength</label>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="4" step="1"
                value={currStrength}
                onChange={e => setCurrStrength(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className={`text-sm font-bold min-w-[80px] ${
                currStrength <= 1 ? 'text-tide-slack' : currStrength <= 2 ? 'text-tide-blue' : currStrength === 3 ? 'text-tide-amber' : 'text-red-600'
              }`}>
                {CURR_STRENGTH[currStrength]}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 px-0.5">
              {CURR_STRENGTH.map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Rating + notes */}
      <div className="card p-5 space-y-4">
        <div className="section-head">Plan accuracy &amp; notes</div>
        <div>
          <label className="label">How accurate was the dive plan?</label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl transition-colors ${n <= rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {['', 'Inaccurate', 'Mostly off', 'Decent', 'Good', 'Excellent'][rating]}
            </div>
          )}
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={3}
            placeholder="What did you observe? Any surprises vs the prediction? Useful notes for future dives…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Community sharing */}
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-gray-50 border border-gray-100">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-tide-slack focus:ring-tide-slack flex-shrink-0"
            checked={shareWithComm}
            onChange={e => setShareWithComm(e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-gray-700">Share with community</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Anonymously contribute your slack delta to community corrections. Your notes and personal details are never shared.
            </div>
          </div>
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
        {loading ? 'Saving dive…' : 'Save dive log'}
      </button>
    </form>
  )
}
