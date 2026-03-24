'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { DiveSite } from '@prisma/client'
import type { CorrectionResult } from '@/lib/corrections'
import BriefingView from './BriefingView'

// Leaflet must be loaded client-side only — no SSR
const StationMap = dynamic(() => import('./StationMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center" style={{ height: 480 }}>
      <div className="text-sm text-gray-400">Loading map…</div>
    </div>
  ),
})

// ── Unit conversion ────────────────────────────────────────────────────────────
const HEIGHT_CONV: Record<string, number> = { ft: 1, m: 0.3048 }
const VEL_CONV:    Record<string, number> = { kt: 1, mph: 1.15078, kph: 1.852, 'm/s': 0.514444 }

// ── NOAA helpers ───────────────────────────────────────────────────────────────
const NOAA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'

function fmtAPI(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dy}`
}
function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtTime(t: Date | null) {
  if (!t) return '—'
  return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function parseT(raw: string | null | undefined): Date | null {
  if (!raw || typeof raw !== 'string') return null
  const parts = raw.trim().split(' ')
  if (parts.length < 2) return null
  const [y, mo, d] = parts[0].split('-').map(Number)
  const [h, mi]    = parts[1].split(':').map(Number)
  if (isNaN(y) || isNaN(mo) || isNaN(d) || isNaN(h) || isNaN(mi)) return null
  return new Date(y, mo - 1, d, h, mi)
}
function getTimeField(p: any): string | null {
  return p.t || p.Time || p.time || p.date_time || null
}
function getVelocity(p: any): number {
  return parseFloat(p.Speed ?? p.Velocity_Major ?? p.speed ?? p.velocity ?? p.v ?? 0) || 0
}
function getCurrentType(p: any): string {
  const r = (p.type || p.Type || p.event || '').toString().toLowerCase()
  if (r === 'f' || r === 'flood') return 'flood'
  if (r === 'e' || r === 'ebb')   return 'ebb'
  if (r === 's' || r === 'slack') return 'slack'
  return r
}
function absMins(m: number) {
  const h = Math.floor(Math.abs(m) / 60), mn = Math.abs(m) % 60
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`
}
function applyCorrection(t: Date, delta: number) {
  return new Date(t.getTime() + delta * 60000)
}

export interface PlanData {
  site:         DiveSite
  date:         Date
  correction:   CorrectionResult | null
  hilo:         any[]
  slack:        any[]
  tideCurve:    any[]
  currCurve:    any[]
  dayRating:    'good' | 'marginal' | 'poor'
  maxFlood:     number
  maxEbb:       number
  tRange:       number
  slackEvents:  any[]
  windows:      Window[]
  unitHeight:   string
  unitVelocity: string
}

export interface Window {
  slackTime:           Date
  windowStart:         Date
  windowEnd:           Date
  correctedTime:       Date | null
  correctedWindowStart:Date | null
  correctedWindowEnd:  Date | null
  nearTide:            any
  lagMins:             number | null
  maxNearby:           number
  quality:             'best' | 'good' | 'marginal' | 'poor'
  tideHAtSlack:        number | null
}

const MIN_OBS = 10

interface Props {
  sites:        DiveSite[]
  corrections:  Record<string, CorrectionResult>
  unitHeight:   string
  unitVelocity: string
}

export default function PlannerClient({ sites, corrections, unitHeight, unitVelocity }: Props) {
  const [step,      setStep]      = useState<1 | 2 | 3>(1)
  const [siteView,  setSiteView]  = useState<'grid' | 'map'>('grid')
  const [selSite,   setSelSite]   = useState<DiveSite | null>(null)
  const [viewDate,  setViewDate]  = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [planData,  setPlanData]  = useState<PlanData | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState('All')

  const regions = ['All', ...Array.from(new Set(sites.map(s => s.region)))]

  // ── Station name lookup ──────────────────────────────────────────────────────
  const CURR_NAMES: Record<string, string> = {
    PUG1515: 'The Narrows', PCT1516: 'Admiralty Inlet', PUG1501: 'Rich Passage',
    PUG1511: 'Colvos Passage', PUG1503: 'Agate Passage', ACT4176: 'Deception Pass',
    PCT1531: 'Port Townsend Canal',
  }
  const TIDE_NAMES: Record<string, string> = {
    '9447130': 'Seattle', '9447110': 'Port Townsend', '9447214': 'Shilshole Bay',
    '9446807': 'Tacoma', '9447359': 'Everett', '9449880': 'Friday Harbor',
    '9448432': 'Anacortes', '9443090': 'Neah Bay',
  }

  // ── Fetch predictions ────────────────────────────────────────────────────────
  async function fetchPlan() {
    if (!selSite) return
    setLoading(true)
    setError(null)
    const d = fmtAPI(viewDate)
    try {
      const [hiloR, slackR, tideCurveR, currCurveR] = await Promise.all([
        fetch(`${NOAA}?begin_date=${d}&end_date=${d}&station=${selSite.tideStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=hilo&units=english&application=tide_tracker&format=json`).then(r => r.json()),
        fetch(`${NOAA}?begin_date=${d}&end_date=${d}&station=${selSite.currStationId}&product=currents_predictions&time_zone=lst_ldt&interval=MAX_SLACK&units=english&application=tide_tracker&format=json`).then(r => r.json()),
        fetch(`${NOAA}?begin_date=${d}&end_date=${d}&station=${selSite.tideStationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=6&units=english&application=tide_tracker&format=json`).then(r => r.json()),
        fetch(`${NOAA}?begin_date=${d}&end_date=${d}&station=${selSite.currStationId}&product=currents_predictions&time_zone=lst_ldt&interval=6&units=english&application=tide_tracker&format=json`).then(r => r.json()),
      ])

      if (hiloR.error)  throw new Error(`Tide (${selSite.tideStationId}): ${hiloR.error.message}`)
      if (slackR.error) throw new Error(`Current (${selSite.currStationId}): ${slackR.error.message}`)

      const hilo = (hiloR.predictions || [])
        .filter((p: any) => getTimeField(p))
        .map((p: any) => ({ t: parseT(getTimeField(p)), v: parseFloat(p.v) || 0, type: p.type }))
        .filter((p: any) => p.t)

      const slackRaw = slackR.current_predictions?.cp || slackR.predictions || slackR.current_predictions || []
      const slack = (Array.isArray(slackRaw) ? slackRaw : [])
        .filter((p: any) => getTimeField(p))
        .map((p: any) => ({ t: parseT(getTimeField(p)), v: getVelocity(p), type: getCurrentType(p) }))
        .filter((p: any) => p.t)

      const tideCurve = (tideCurveR.predictions || [])
        .filter((p: any) => getTimeField(p))
        .map((p: any) => ({ t: parseT(getTimeField(p)), v: parseFloat(p.v) || 0 }))
        .filter((p: any) => p.t)

      const ccRaw = currCurveR.current_predictions?.cp || currCurveR.predictions || currCurveR.current_predictions || []
      const currCurve = (Array.isArray(ccRaw) ? ccRaw : [])
        .filter((p: any) => getTimeField(p))
        .map((p: any) => {
          const type = getCurrentType(p)
          const v    = getVelocity(p)
          return { t: parseT(getTimeField(p)), v: type === 'ebb' ? -v : v, absV: v, type }
        })
        .filter((p: any) => p.t)

      const corr       = corrections[selSite.id] ?? null
      const corrActive = corr?.active && corr.n >= MIN_OBS

      const slackEvents = slack.filter((s: any) => s.type === 'slack')
      const windows: Window[] = slackEvents.map((sl: any) => {
        let nearTide = null, minD = Infinity
        hilo.forEach((h: any) => { const dd = Math.abs(sl.t - h.t); if (dd < minD) { minD = dd; nearTide = h } })
        const lagMins   = nearTide ? Math.round((sl.t - (nearTide as any).t) / 60000) : null
        const w2h       = currCurve.filter((p: any) => Math.abs(p.t - sl.t) <= 7200000)
        const maxNearby = w2h.length ? Math.max(...w2h.map((p: any) => p.absV)) : 0

        let quality: Window['quality']
        if      (maxNearby < 1.5 && (lagMins === null || Math.abs(lagMins) < 90))  quality = 'best'
        else if (maxNearby < 3   && (lagMins === null || Math.abs(lagMins) < 150)) quality = 'good'
        else if (maxNearby < 4.5) quality = 'marginal'
        else                      quality = 'poor'

        let tideHAtSlack = null
        if (tideCurve.length) {
          const before = tideCurve.filter((p: any) => p.t <= sl.t).slice(-1)[0]
          const after  = tideCurve.filter((p: any) => p.t > sl.t)[0]
          if (before && after) {
            const frac = (sl.t - before.t) / (after.t - before.t)
            tideHAtSlack = before.v + frac * (after.v - before.v)
          }
        }

        const correctedTime        = corrActive && corr?.meanDelta != null ? applyCorrection(sl.t, corr.meanDelta) : null
        const correctedWindowStart = correctedTime ? new Date(correctedTime.getTime() - 45 * 60000) : null
        const correctedWindowEnd   = correctedTime ? new Date(correctedTime.getTime() + 45 * 60000) : null

        return { slackTime: sl.t, windowStart: new Date(sl.t.getTime() - 45*60000), windowEnd: new Date(sl.t.getTime() + 45*60000), correctedTime, correctedWindowStart, correctedWindowEnd, nearTide, lagMins, maxNearby, quality, tideHAtSlack }
      })

      const bestCount = windows.filter(w => w.quality === 'best' || w.quality === 'good').length
      const dayRating = windows.length === 0 ? 'poor' : bestCount > 0 ? 'good' : 'marginal'
      const floods    = currCurve.filter((p: any) => p.v > 0)
      const ebbs      = currCurve.filter((p: any) => p.v < 0)
      const maxFlood  = floods.length ? Math.max(...floods.map((p: any) => p.v))         : 0
      const maxEbb    = ebbs.length   ? Math.max(...ebbs.map((p: any)   => Math.abs(p.v))): 0
      const tRange    = hilo.length   ? Math.max(...hilo.map((p: any) => p.v)) - Math.min(...hilo.map((p: any) => p.v)) : 0

      setPlanData({ site: selSite, date: viewDate, correction: corr, hilo, slack, tideCurve, currCurve, dayRating: dayRating as any, maxFlood, maxEbb, tRange, slackEvents, windows, unitHeight, unitVelocity })
      setStep(3)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicators ──────────────────────────────────────────────────────────
  const steps = ['Dive site', 'Date', 'Briefing']

  return (
    <div className="max-w-4xl">
      {/* Step header */}
      <div className="flex border border-gray-100 rounded-xl overflow-hidden mb-6 bg-gray-50">
        {steps.map((label, i) => {
          const n    = i + 1
          const active = step === n
          const done   = step > n
          return (
            <button
              key={n}
              onClick={() => { if (done) setStep(n as 1|2|3) }}
              disabled={!done && !active}
              className={`flex-1 flex items-center gap-2 px-4 py-3 text-xs font-semibold border-r last:border-r-0 border-gray-100 transition-colors ${
                active ? 'bg-white text-gray-900' :
                done   ? 'text-tide-slack cursor-pointer hover:bg-tide-slack-lt' :
                         'text-gray-400 cursor-default'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                active ? 'bg-tide-blue text-white' :
                done   ? 'bg-tide-slack text-white' :
                         'bg-gray-200 text-gray-400'
              }`}>{n}</span>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Step 1: Site selector ── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Sites / Map tab switcher */}
          <div className="flex gap-1 border-b border-gray-100">
            {(['grid', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => setSiteView(v)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  siteView === v
                    ? 'border-tide-blue text-tide-blue'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {v === 'grid' ? 'Sites' : 'Map'}
              </button>
            ))}
          </div>

          {/* Map view */}
          {siteView === 'map' && (
            <StationMap
              sites={sites}
              corrections={corrections}
              selectedId={selSite?.id ?? null}
              onSelect={site => { setSelSite(site); setStep(2) }}
            />
          )}

          {/* Grid view */}
          {siteView === 'grid' && (
            <>
              <div className="flex gap-2 flex-wrap">
                {regions.map(r => (
                  <button
                    key={r}
                    onClick={() => setRegionFilter(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      regionFilter === r
                        ? 'bg-tide-blue text-white border-tide-blue'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sites
              .filter(s => regionFilter === 'All' || s.region === regionFilter)
              .map(s => {
                const corr     = corrections[s.id]
                const hasCorr  = corr?.active
                const partial  = corr && !corr.active && corr.n > 0
                const skillColor = s.skill === 'beginner' ? 'text-tide-teal bg-tide-teal-lt' : s.skill === 'advanced' ? 'text-red-600 bg-red-50' : 'text-tide-amber bg-tide-amber-lt'
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelSite(s); setStep(2) }}
                    className={`text-left border rounded-xl p-4 transition-all hover:border-tide-blue hover:bg-tide-blue-lt ${
                      selSite?.id === s.id ? 'border-tide-blue bg-tide-blue-lt ring-2 ring-tide-blue' : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{s.region}</div>
                    <div className="font-semibold text-gray-900 mb-1">{s.name}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">{s.type}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${skillColor}`}>{s.skill}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-400 mb-2">to {s.depthFt} ft</div>
                    {s.description && <div className="text-xs text-gray-500 leading-relaxed mb-2">{s.description}</div>}
                    {s.currentWarn && (
                      <div className="text-xs font-bold text-red-500 flex items-center gap-1 mb-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">!</span>
                        Current sensitive
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-100 space-y-0.5">
                      <div className="text-xs text-gray-400">
                        <span className="text-tide-teal font-semibold">{CURR_NAMES[s.currStationId] ?? s.currStationId}</span>
                        {' '}· current
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="text-tide-blue-dk font-semibold">{TIDE_NAMES[s.tideStationId] ?? s.tideStationId}</span>
                        {' '}· tide
                      </div>
                      {hasCorr && (
                        <div className="text-xs font-bold text-tide-slack-dk bg-tide-slack-lt px-1.5 py-0.5 rounded inline-block mt-1">
                          correction active · {corr.n} obs
                        </div>
                      )}
                      {partial && (
                        <div className="text-xs text-gray-400 mt-1">{corr.n}/{MIN_OBS} obs · correction pending</div>
                      )}
                    </div>
                  </button>
                )
              })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Date picker ── */}
      {step === 2 && selSite && (
        <div className="max-w-lg space-y-5">
          {/* Station pair */}
          <div className="card p-4 grid grid-cols-2 gap-0">
            <div className="pr-4 border-r border-gray-100">
              <div className="text-xs font-bold uppercase tracking-wider text-tide-teal mb-1">Current station</div>
              <div className="font-semibold text-gray-900">{CURR_NAMES[selSite.currStationId] ?? selSite.currStationId}</div>
              <div className="text-xs font-mono text-gray-400">{selSite.currStationId}</div>
              {corrections[selSite.id]?.active && (
                <div className="text-xs font-bold text-tide-slack-dk bg-tide-slack-lt px-1.5 py-0.5 rounded inline-block mt-1.5">
                  Δ{(corrections[selSite.id].meanDelta ?? 0) > 0 ? '+' : ''}{corrections[selSite.id].meanDelta}m correction active
                </div>
              )}
            </div>
            <div className="pl-4">
              <div className="text-xs font-bold uppercase tracking-wider text-tide-blue-dk mb-1">Tide station</div>
              <div className="font-semibold text-gray-900">{TIDE_NAMES[selSite.tideStationId] ?? selSite.tideStationId}</div>
              <div className="text-xs font-mono text-gray-400">{selSite.tideStationId}</div>
            </div>
          </div>

          {/* Quick date chips */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick select</div>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + i)
                const active = fmtAPI(d) === fmtAPI(viewDate)
                return (
                  <button
                    key={i}
                    onClick={() => setViewDate(new Date(d))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active ? 'bg-tide-blue text-white border-tide-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {fmtShort(d)}{i === 0 ? ' (today)' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step nav */}
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(viewDate.getTime() - 86400000); setViewDate(d) }} className="btn-secondary px-3">‹</button>
            <span className="text-sm font-mono text-gray-700 flex-1 text-center">{fmtDisplay(viewDate)}</span>
            <button onClick={() => { const d = new Date(viewDate.getTime() + 86400000); setViewDate(d) }} className="btn-secondary px-3">›</button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={fetchPlan}
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Fetching from NOAA…' : 'Fetch predictions'}
          </button>
        </div>
      )}

      {/* ── Step 3: Briefing ── */}
      {step === 3 && planData && (
        <BriefingView
          planData={planData}
          currName={CURR_NAMES[planData.site.currStationId] ?? planData.site.currStationId}
          tideName={TIDE_NAMES[planData.site.tideStationId] ?? planData.site.tideStationId}
          onChangeDate={() => setStep(2)}
          onChangeSite={() => { setPlanData(null); setStep(1) }}
        />
      )}
    </div>
  )
}
