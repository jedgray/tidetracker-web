'use client'

import dynamic from 'next/dynamic'
import type { PlanData, Window } from './PlannerClient'
import type { CorrectionResult } from '@/lib/corrections'

const BriefingChart = dynamic(() => import('./BriefingChart'), { ssr: false })

const MIN_OBS = 10

function fmtTime(t: Date | null) {
  if (!t) return '—'
  return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function absMins(m: number) {
  const h = Math.floor(Math.abs(m) / 60), mn = Math.abs(m) % 60
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`
}
function cvtH(ft: number, unit: string) {
  return unit === 'm' ? (ft * 0.3048).toFixed(2) : ft.toFixed(1)
}
function cvtV(kt: number, unit: string) {
  const conv: Record<string, number> = { kt: 1, mph: 1.15078, kph: 1.852, 'm/s': 0.514444 }
  return (Math.abs(kt) * (conv[unit] ?? 1)).toFixed(unit === 'm/s' ? 2 : 1)
}
function confLabel(c: number | null) {
  if (!c) return 'Low'
  return ['Low','Fair','Moderate','Good','High'][Math.min(Math.round(c * 5) - 1, 4)] ?? 'Low'
}
function confPips(c: number | null) {
  const n = c ? Math.round(c * 5) : 0
  return [1,2,3,4,5].map(i => (
    `<span class="inline-block w-2.5 h-2.5 rounded-sm ${i <= n ? 'bg-tide-slack' : 'bg-gray-200'}"></span>`
  )).join('')
}

interface Props {
  planData:      PlanData
  currName:      string
  tideName:      string
  onChangeDate:  () => void
  onChangeSite:  () => void
}

export default function BriefingView({ planData, currName, tideName, onChangeDate, onChangeSite }: Props) {
  const { site, date, correction, hilo, slack, tideCurve, currCurve, currCurveAvailable, tideCurveFromSeattle, dayRating, maxFlood, maxEbb, tRange, slackEvents, windows, unitHeight, unitVelocity } = planData
  const now       = new Date()
  const isToday   = date.toDateString() === now.toDateString()
  const corrActive = correction?.active && (correction.n ?? 0) >= MIN_OBS
  const goodWindows = windows.filter(w => w.quality === 'best' || w.quality === 'good').sort((a, b) => a.slackTime.getTime() - b.slackTime.getTime())
  const bestWindow  = goodWindows[0]
  const bestDisplayTime = bestWindow ? (corrActive && bestWindow.correctedTime ? bestWindow.correctedTime : bestWindow.slackTime) : null
  const showWarn = (site.skill === 'advanced' || site.currentWarn) && (dayRating === 'marginal' || dayRating === 'poor')

  // Merged timeline
  const timeline = [
    ...hilo.map((h: any)  => ({ t: h.t as Date, kind: 'tide',  type: h.type,  val: h.v,  src: tideName })),
    ...slackEvents.map((s: any) => ({ t: s.t as Date, kind: 'slack', type: 'slack', val: s.v,  src: currName })),
    ...slack.filter((s: any) => s.type === 'flood' || s.type === 'ebb').map((s: any) => ({ t: s.t as Date, kind: 'curr', type: s.type, val: s.v, src: currName })),
  ].sort((a, b) => a.t.getTime() - b.t.getTime())

  const heroCls = dayRating === 'good' ? 'bg-tide-slack-lt border-tide-slack' : dayRating === 'marginal' ? 'bg-tide-amber-lt border-tide-amber' : 'bg-red-50 border-red-300'
  const heroRatingCls = dayRating === 'good' ? 'text-tide-slack-dk' : dayRating === 'marginal' ? 'text-tide-amber' : 'text-red-600'

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Hero */}
      <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 flex-wrap ${heroCls}`}>
        <div>
          <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${heroRatingCls}`}>
            {dayRating === 'good' ? 'Good dive day' : dayRating === 'marginal' ? 'Marginal conditions' : 'Poor conditions'}
          </div>
          <div className="text-base font-bold text-gray-900">
            {site.name}{bestDisplayTime ? ` · Best window ${fmtTime(bestDisplayTime)}` : ''}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {goodWindows.length} recommended window{goodWindows.length !== 1 ? 's' : ''} · {windows.length} slack event{windows.length !== 1 ? 's' : ''} · {site.type} · to {site.depthFt} ft
            {corrActive ? ` · correction Δ${(correction!.meanDelta ?? 0) > 0 ? '+' : ''}${correction!.meanDelta}m` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-gray-500">{fmtDisplay(date)}</div>
          <div className="text-xs text-gray-500 mt-0.5">{currName} + {tideName}</div>
        </div>
      </div>

      {/* Conditions warning */}
      {showWarn && (
        <div className="rounded-lg border border-tide-amber bg-tide-amber-lt p-3 text-sm text-amber-800 flex gap-2">
          <span className="font-bold flex-shrink-0">⚠</span>
          <span><strong>{site.name}</strong> is {site.skill === 'advanced' ? 'an advanced site' : 'current-sensitive'} and today's conditions are {dayRating}. Verify with an experienced local diver before committing.</span>
        </div>
      )}

      {/* Correction banner */}
      {corrActive ? (
        <div className="rounded-lg border border-tide-slack bg-tide-slack-lt p-4 flex gap-3">
          <div className="w-8 h-8 rounded-full bg-tide-slack flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <div>
            <div className="text-xs font-bold text-tide-slack-dk mb-1">Site correction active</div>
            <div className="text-xs text-tide-slack-dk leading-relaxed">
              Slack times adjusted by <strong>{(correction!.meanDelta ?? 0) > 0 ? '+' : ''}{correction!.meanDelta} min</strong> based on {correction!.n} logged dives at {site.name}. Harmonic prediction shown struck-through for reference.
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 text-tide-slack-dk">{correction!.n} observations</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 text-tide-slack-dk">±{correction!.stdDev}m std dev</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 text-tide-slack-dk">{confLabel(correction!.confidence)} confidence</span>
            </div>
          </div>
        </div>
      ) : correction && !correction.active ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          Correction pending: {correction.n}/{MIN_OBS} required observations logged for {site.name}. {correction.needed} more needed.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          No correction data yet for {site.name}. Log dives with observed slack to build site-specific corrections ({MIN_OBS} minimum).
        </div>
      )}

      {/* Dive windows */}
      <div>
        <div className="section-head mb-3">Dive windows · {currName}{corrActive ? ' · corrected' : ''}</div>
        {windows.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {windows.map((w, i) => {
              const qLabel = { best: 'Best window', good: 'Good window', marginal: 'Marginal', poor: 'Not recommended' }[w.quality]
              const cardCls = w.quality === 'best' ? 'border-tide-slack bg-tide-slack-lt' : w.quality === 'good' ? 'border-tide-teal bg-tide-teal-lt' : w.quality === 'marginal' ? 'border-tide-amber bg-tide-amber-lt' : 'border-gray-200 bg-white'
              const qCls = w.quality === 'best' ? 'text-tide-slack-dk' : w.quality === 'good' ? 'text-tide-teal-dk' : w.quality === 'marginal' ? 'text-tide-amber' : 'text-red-500'
              const lagStr = w.lagMins !== null ? `${absMins(w.lagMins)} ${w.lagMins >= 0 ? 'after' : 'before'} ${(w.nearTide as any)?.type === 'H' ? 'high' : 'low'}` : 'no tide pair'
              const tideStr = w.tideHAtSlack !== null ? `${cvtH(w.tideHAtSlack, unitHeight)} ${unitHeight} at ${tideName}` : ''
              const lagTagCls = w.lagMins !== null && Math.abs(w.lagMins) < 60 ? 'bg-tide-slack-lt text-tide-slack-dk' : 'bg-tide-amber-lt text-tide-amber'

              return (
                <div key={i} className={`border rounded-xl p-4 flex flex-col gap-1.5 ${cardCls}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider ${qCls}`}>{qLabel}</div>
                  {corrActive && w.correctedTime ? (
                    <>
                      <div className="text-xl font-bold font-mono text-gray-900">{fmtTime(w.correctedTime)}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Harmonic:</span>
                        <span className="text-xs font-mono text-gray-400 line-through">{fmtTime(w.slackTime)}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${(correction!.meanDelta ?? 0) < 0 ? 'bg-tide-teal-lt text-tide-teal-dk' : 'bg-tide-amber-lt text-tide-amber'}`}>
                          {(correction!.meanDelta ?? 0) > 0 ? '+' : ''}{correction!.meanDelta}m
                        </span>
                      </div>
                      <div className="text-xs font-mono text-gray-500">{fmtTime(w.correctedWindowStart)} – {fmtTime(w.correctedWindowEnd)}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold font-mono text-gray-900">{fmtTime(w.slackTime)}</div>
                      <div className="text-xs font-mono text-gray-500">{fmtTime(w.windowStart)} – {fmtTime(w.windowEnd)}</div>
                    </>
                  )}
                  <div className="text-xs text-gray-600 mt-1">
                    Peak nearby: {cvtV(w.maxNearby, unitVelocity)} {unitVelocity}
                    {tideStr ? <><br />{tideStr}</> : ''}
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full self-start mt-1 ${lagTagCls}`}>{lagStr}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-400 p-4 text-center card">No slack events found for this date.</div>
        )}
      </div>

      {/* Chart */}
      <BriefingChart
        key={`${site.id}-${date.toISOString()}`}
        tideCurve={tideCurve.map((p: any) => ({ t: p.t as Date, v: p.v as number }))}
        currCurve={currCurve.map((p: any) => ({ t: p.t as Date, v: p.v as number }))}
        slackEvents={slackEvents.map((s: any) => ({ t: s.t as Date, type: s.type as string }))}
        hiloEvents={hilo.map((h: any) => ({ t: h.t as Date, v: h.v as number, type: h.type as string }))}
        correctedSlacks={windows
          .filter(w => w.correctedTime !== null)
          .map(w => w.correctedTime as Date)}
        unitHeight={unitHeight}
        unitVelocity={unitVelocity}
        corrDelta={corrActive ? (correction?.meanDelta ?? null) : null}
        currCurveAvailable={currCurveAvailable}
        tideCurveFromSeattle={tideCurveFromSeattle}
      />

      {/* Conditions summary */}
      <div>
        <div className="section-head mb-3">Conditions summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Max flood', val: `${cvtV(maxFlood, unitVelocity)}`, unit: unitVelocity, cls: 'text-tide-blue',   sub: currName },
            { label: 'Max ebb',   val: `${cvtV(maxEbb,   unitVelocity)}`, unit: unitVelocity, cls: 'text-tide-purple', sub: currName },
            { label: 'Tidal range', val: `${cvtH(tRange, unitHeight)}`, unit: unitHeight, cls: tRange > 12 ? 'text-red-500' : tRange > 8 ? 'text-tide-amber' : 'text-tide-teal', sub: tideName },
            { label: 'Slack events', val: `${slackEvents.length}`, unit: '', cls: 'text-tide-slack', sub: 'Total today' },
            { label: 'Curr station', val: currName, unit: '', cls: 'text-tide-teal text-xs', sub: site.currStationId },
            { label: 'Tide station', val: tideName, unit: '', cls: 'text-tide-blue-dk text-xs', sub: site.tideStationId },
          ].map((c, i) => (
            <div key={i} className="card p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{c.label}</div>
              <div className={`font-bold font-mono leading-tight ${c.cls}`}>{c.val}<span className="text-xs font-normal text-gray-400 ml-0.5">{c.unit}</span></div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="section-head mb-3">Day timeline{corrActive ? ' · corrected slack highlighted' : ''}</div>
        <div className="space-y-1.5">
          {timeline.map((e, i) => {
            const isNow   = isToday && Math.abs(e.t.getTime() - now.getTime()) < 30 * 60000
            const corrRow = corrActive && e.kind === 'slack'
            let badge: string, val: string

            if (e.kind === 'tide') {
              badge = `<span class="text-xs font-bold px-2 py-0.5 rounded-full ${e.type === 'H' ? 'bg-tide-blue-lt text-tide-blue-dk' : 'bg-tide-amber-lt text-tide-amber'}">${e.type === 'H' ? 'High tide' : 'Low tide'}</span>`
              val   = `${cvtH(e.val, unitHeight)} ${unitHeight} MLLW · ${e.src}`
            } else if (e.kind === 'slack') {
              badge = `<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-tide-slack-lt text-tide-slack-dk">Slack water</span>`
              val   = `${e.val.toFixed(2)} kt · ${e.src}`
            } else {
              badge = `<span class="text-xs font-bold px-2 py-0.5 rounded-full ${e.type === 'flood' ? 'bg-blue-50 text-blue-700' : 'bg-tide-purple-lt text-tide-purple'}">${e.type === 'flood' ? 'Flood' : 'Ebb'}</span>`
              val   = `${cvtV(e.val, unitVelocity)} ${unitVelocity} · ${e.src}`
            }

            let corrTag = ''
            if (corrRow && correction?.meanDelta != null) {
              const corrTime = new Date(e.t.getTime() + correction.meanDelta * 60000)
              const dStr = `${correction.meanDelta < 0 ? '−' : '+'}${Math.abs(correction.meanDelta)}m`
              corrTag = `<span class="text-xs font-bold px-1.5 py-0.5 rounded bg-tide-slack text-white ml-1">corrected ${fmtTime(corrTime)} (${dStr})</span>`
            }

            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${corrRow ? 'bg-tide-slack-lt border border-tide-slack' : 'bg-gray-50'}`}>
                <div className="font-mono text-xs font-semibold text-gray-700 min-w-[58px]">{fmtTime(e.t)}</div>
                <div dangerouslySetInnerHTML={{ __html: badge }} />
                <div className="text-xs text-gray-600 flex-1">{val}</div>
                {corrTag && <div dangerouslySetInnerHTML={{ __html: corrTag }} />}
                {isNow && <span className="text-xs font-bold text-tide-slack bg-tide-slack-lt px-1.5 py-0.5 rounded-full">now</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Safety notes */}
      <div>
        <div className="section-head mb-3">Safety notes</div>
        <div className="card p-4 text-sm text-gray-600 leading-relaxed space-y-1.5">
          <p><strong className="text-gray-900">Always verify on the day.</strong> Predictions — including corrections — don't account for weather, wind, or pressure changes.</p>
          {corrActive && <p><strong className="text-gray-900">Correction note:</strong> The Δ{(correction!.meanDelta ?? 0) > 0 ? '+' : ''}{correction!.meanDelta} min adjustment is a mean across {correction!.n} dives (±{correction!.stdDev}m std dev). Treat it as a refinement, not a guarantee.</p>}
          {site.currentWarn && <p><strong className="text-gray-900">{site.name}</strong> is current-sensitive — slack duration may be short. Plan bottom time conservatively.</p>}
          <p><strong className="text-gray-900">Slack lag:</strong> Slack water at {currName} does not coincide with tidal extremes at {tideName}. Always use the current station times above.</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-3 pt-2">
        <button onClick={onChangeDate} className="btn-secondary text-sm">← Change date</button>
        <button onClick={onChangeSite} className="btn-secondary text-sm">← Change site</button>
        <span className="ml-auto text-xs text-gray-400 self-center">Cmd/Ctrl+P to save as PDF</span>
      </div>
    </div>
  )
}
