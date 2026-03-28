'use client'

import { useEffect, useRef, useState } from 'react'

interface DataPoint { t: Date; v: number }
interface SlackEvent { t: Date; type: string }
interface HiloEvent  { t: Date; v: number; type: string }

interface Props {
  tideCurve:       DataPoint[]
  currCurve:       DataPoint[]
  slackEvents:     SlackEvent[]
  hiloEvents:      HiloEvent[]
  correctedSlacks: Date[]
  unitHeight:      string
  unitVelocity:    string
  corrDelta:       number | null
}

const HEIGHT_CONV: Record<string, number> = { ft: 1, m: 0.3048 }
const VEL_CONV:    Record<string, number> = { kt: 1, mph: 1.15078, kph: 1.852, 'm/s': 0.514444 }

// Linear interpolation between two data points at a given x (ms timestamp)
function interpolate(data: { x: number; y: number }[], xMs: number): number | null {
  if (!data.length) return null
  const before = [...data].reverse().find(p => p.x <= xMs)
  const after  = data.find(p => p.x >= xMs)
  if (!before && !after) return null
  if (!before) return after!.y
  if (!after)  return before.y
  if (before.x === after.x) return before.y
  const frac = (xMs - before.x) / (after.x - before.x)
  return before.y + frac * (after.y - before.y)
}

interface CrosshairState {
  visible:  boolean
  xMs:      number
  xPx:      number
  tide:     number | null
  curr:     number | null
  flipLeft: boolean
}

export default function BriefingChart({
  tideCurve, currCurve, slackEvents, hiloEvents,
  correctedSlacks, unitHeight, unitVelocity, corrDelta,
}: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const wrapRef       = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<any>(null)
  const crosshairRef  = useRef<CrosshairState>({ visible: false, xMs: 0, xPx: 0, tide: null, curr: null, flipLeft: false })
  const rafRef        = useRef<number | null>(null)
  const tValsRef      = useRef<{ x: number; y: number }[]>([])
  const cValsRef      = useRef<{ x: number; y: number }[]>([])
  const [tooltip, setTooltip] = useState<CrosshairState | null>(null)

  // Convert pixel x → ms timestamp using chart scales
  function pxToMs(chart: any, clientX: number): number | null {
    const rect  = chart.canvas.getBoundingClientRect()
    const relX  = clientX - rect.left
    const scale = chart.scales.x
    if (relX < scale.left || relX > scale.right) return null
    const frac  = (relX - scale.left) / (scale.right - scale.left)
    return scale.min + frac * (scale.max - scale.min)
  }

  function updateCrosshair(chart: any, clientX: number) {
    const xMs = pxToMs(chart, clientX)
    if (xMs === null) {
      crosshairRef.current = { ...crosshairRef.current, visible: false }
      setTooltip(null)
      chart.render()
      return
    }

    const rect    = chart.canvas.getBoundingClientRect()
    const relX    = clientX - rect.left
    const flipLeft = relX > (chart.scales.x.right - chart.scales.x.left) * 0.65 + chart.scales.x.left
    const tide    = interpolate(tValsRef.current, xMs)
    const curr    = interpolate(cValsRef.current, xMs)

    crosshairRef.current = { visible: true, xMs, xPx: relX, tide, curr, flipLeft }
    setTooltip({ visible: true, xMs, xPx: relX, tide, curr, flipLeft })

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => chart.render())
  }

  function clearCrosshair(chart: any) {
    crosshairRef.current = { ...crosshairRef.current, visible: false }
    setTooltip(null)
    chart.render()
  }

  useEffect(() => {
    if (!canvasRef.current || !tideCurve.length) return

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

      const hConv = HEIGHT_CONV[unitHeight] ?? 1
      const vConv = VEL_CONV[unitVelocity]  ?? 1

      tValsRef.current = tideCurve.map(p => ({ x: p.t.getTime(), y: parseFloat((p.v * hConv).toFixed(unitHeight === 'm' ? 2 : 1)) }))
      cValsRef.current = currCurve.map(p => ({ x: p.t.getTime(), y: parseFloat((p.v * vConv).toFixed(unitVelocity === 'm/s' ? 2 : 1)) }))
      const cAbsMax = Math.max(...currCurve.map(p => Math.abs(p.v) * vConv), 0.5)

      // ── Vertical event lines plugin ──────────────────────────────────────────
      const vlinePlugin = {
        id: 'vlines',
        afterDraw(chart: any) {
          const { ctx, scales: { x, yLeft } } = chart
          const xMin = x.min, xMax = x.max, xSpan = xMax - xMin

          hiloEvents.forEach(ev => {
            const ms = ev.t.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath(); ctx.setLineDash([3,4])
            ctx.strokeStyle = ev.type === 'H' ? 'rgba(10,107,189,0.3)' : 'rgba(180,83,9,0.3)'
            ctx.lineWidth = 1
            ctx.moveTo(xi, yLeft.top); ctx.lineTo(xi, yLeft.bottom); ctx.stroke()
            ctx.restore()
          })

          slackEvents.filter(s => s.type === 'slack').forEach(sl => {
            const ms = sl.t.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath(); ctx.setLineDash([])
            ctx.strokeStyle = 'rgba(5,150,105,0.65)'; ctx.lineWidth = 1.5
            ctx.moveTo(xi, yLeft.top); ctx.lineTo(xi, yLeft.bottom); ctx.stroke()
            ctx.fillStyle = 'rgba(5,150,105,0.85)'; ctx.font = 'bold 9px system-ui'
            ctx.fillText('S', xi + 3, yLeft.top + 10)
            ctx.restore()
          })

          correctedSlacks.forEach(ct => {
            const ms = ct.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath(); ctx.setLineDash([4,3])
            ctx.strokeStyle = 'rgba(180,83,9,0.7)'; ctx.lineWidth = 1.5
            ctx.moveTo(xi, yLeft.top); ctx.lineTo(xi, yLeft.bottom); ctx.stroke()
            ctx.fillStyle = 'rgba(180,83,9,0.85)'; ctx.font = 'bold 9px system-ui'
            ctx.fillText('C', xi + 3, yLeft.top + 22)
            ctx.restore()
          })

          // ── Crosshair line ────────────────────────────────────────────────────
          const ch = crosshairRef.current
          if (!ch.visible) return
          const xi = ch.xPx
          if (xi < x.left || xi > x.right) return

          ctx.save()
          ctx.beginPath(); ctx.setLineDash([4, 3])
          ctx.strokeStyle = 'rgba(100,116,139,0.7)'; ctx.lineWidth = 1.5
          ctx.moveTo(xi, yLeft.top); ctx.lineTo(xi, yLeft.bottom); ctx.stroke()

          // Dots on each curve at crosshair x
          const tY = interpolate(tValsRef.current, ch.xMs)
          const cY = interpolate(cValsRef.current, ch.xMs)
          if (tY !== null) {
            const py = chart.scales.yLeft.getPixelForValue(tY)
            ctx.beginPath(); ctx.setLineDash([])
            ctx.fillStyle = '#1a73e8'
            ctx.arc(xi, py, 4, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
            ctx.stroke()
          }
          if (cY !== null) {
            const py = chart.scales.yRight.getPixelForValue(cY)
            ctx.beginPath(); ctx.setLineDash([])
            const dir = Math.abs(cY) < 0.05 ? '#059669' : cY > 0 ? '#2563eb' : '#7c3aed'
            ctx.fillStyle = dir
            ctx.arc(xi, py, 4, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
            ctx.stroke()
          }
          ctx.restore()
        },
      }

      const chart = new Chart(canvasRef.current!, {
        type: 'line',
        plugins: [vlinePlugin],
        data: {
          datasets: [
            {
              label: `Tide (${unitHeight})`,
              data: tValsRef.current,
              borderColor: '#1a73e8', borderWidth: 2,
              backgroundColor: 'rgba(26,115,232,0.06)',
              fill: true, pointRadius: 0, tension: 0.4,
              yAxisID: 'yLeft', parsing: false,
            },
            {
              label: `Current (${unitVelocity})`,
              data: cValsRef.current,
              borderColor: '#00897b', borderWidth: 1.5,
              borderDash: [5, 4],
              fill: false, pointRadius: 0, tension: 0.4,
              yAxisID: 'yRight', parsing: false,
              segment: {
                borderColor: (ctx: any) => {
                  const v = ctx.p0.parsed.y
                  return v > 0.1 ? '#2563eb' : v < -0.1 ? '#7c3aed' : '#059669'
                },
              },
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }, // disabled — using custom crosshair
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              type: 'linear',
              ticks: {
                callback: v => {
                  const d = new Date(parseInt(String(v)))
                  return d.getMinutes() === 0 && d.getHours() % 3 === 0
                    ? d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                    : null
                },
                maxTicksLimit: 10, font: { size: 9 }, color: '#8b96a8',
              },
              grid: { color: 'rgba(0,0,0,0.04)' },
            },
            yLeft: {
              type: 'linear', position: 'left',
              title: { display: true, text: `Height (${unitHeight})`, color: '#1a73e8', font: { size: 9, weight: 'bold' as const } },
              ticks: { callback: v => `${parseFloat(String(v)).toFixed(1)} ${unitHeight}`, font: { size: 9 }, color: '#1a73e8' },
              grid: { color: 'rgba(0,0,0,0.04)' },
            },
            yRight: {
              type: 'linear', position: 'right',
              min: -cAbsMax * 1.2, max: cAbsMax * 1.2,
              title: { display: true, text: `Velocity (${unitVelocity})`, color: '#00897b', font: { size: 9, weight: 'bold' as const } },
              ticks: {
                callback: v => {
                  const val = parseFloat(String(v))
                  if (Math.abs(val) < cAbsMax * 0.05) return `0 ${unitVelocity}`
                  return `${val > 0 ? '+' : ''}${val.toFixed(unitVelocity === 'm/s' ? 2 : 1)}`
                },
                font: { size: 9 }, color: '#00897b', maxTicksLimit: 7,
              },
              grid: { drawOnChartArea: false },
            },
          },
        },
      })

      chartRef.current = chart

      // ── Event listeners ──────────────────────────────────────────────────────
      const canvas = canvasRef.current!

      // Desktop — mousemove / mouseleave
      const onMouseMove = (e: MouseEvent) => updateCrosshair(chart, e.clientX)
      const onMouseLeave = () => clearCrosshair(chart)

      // Mobile — touch
      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        updateCrosshair(chart, e.touches[0].clientX)
      }
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        updateCrosshair(chart, e.touches[0].clientX)
      }
      const onTouchEnd = () => {
        // Keep crosshair visible on tap — clear after 3s on mobile
        setTimeout(() => clearCrosshair(chart), 3000)
      }

      canvas.addEventListener('mousemove',  onMouseMove)
      canvas.addEventListener('mouseleave', onMouseLeave)
      canvas.addEventListener('touchstart', onTouchStart, { passive: false })
      canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
      canvas.addEventListener('touchend',   onTouchEnd)

      return () => {
        canvas.removeEventListener('mousemove',  onMouseMove)
        canvas.removeEventListener('mouseleave', onMouseLeave)
        canvas.removeEventListener('touchstart', onTouchStart)
        canvas.removeEventListener('touchmove',  onTouchMove)
        canvas.removeEventListener('touchend',   onTouchEnd)
      }
    })

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    }
  }, [tideCurve, currCurve, unitHeight, unitVelocity]) // eslint-disable-line react-hooks/exhaustive-deps

  // Format crosshair values for the tooltip overlay
  const hConv = HEIGHT_CONV[unitHeight] ?? 1
  const vConv = VEL_CONV[unitVelocity]  ?? 1

  function fmtTooltip(tt: CrosshairState) {
    const time = new Date(tt.xMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const tideStr = tt.tide !== null
      ? `${(tt.tide).toFixed(unitHeight === 'm' ? 2 : 1)} ${unitHeight}`
      : '—'
    const currRaw = tt.curr ?? 0
    const dir = Math.abs(currRaw) < 0.05 ? 'Slack' : currRaw > 0 ? 'Flood ▲' : 'Ebb ▼'
    const dirColor = Math.abs(currRaw) < 0.05 ? '#059669' : currRaw > 0 ? '#2563eb' : '#7c3aed'
    const currStr = tt.curr !== null
      ? `${Math.abs(tt.curr).toFixed(unitVelocity === 'm/s' ? 2 : 1)} ${unitVelocity}`
      : '—'
    return { time, tideStr, dir, dirColor, currStr }
  }

  return (
    <div className="card p-4">
      {/* Header + legend */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Tide &amp; current</div>
        <div className="flex gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-0.5 bg-tide-blue rounded" />Tide
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-0.5 bg-tide-teal rounded" />Current
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-0.5 bg-tide-slack rounded" />S
          </div>
          {correctedSlacks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-3 h-0.5 bg-tide-amber rounded" />C
            </div>
          )}
        </div>
      </div>

      {/* Chart + floating tooltip overlay */}
      <div ref={wrapRef} className="relative select-none" style={{ height: '220px' }}>
        <canvas ref={canvasRef} style={{ cursor: 'crosshair' }} />

        {/* Floating crosshair tooltip */}
        {tooltip?.visible && (() => {
          const { time, tideStr, dir, dirColor, currStr } = fmtTooltip(tooltip)
          const leftPct = tooltip.flipLeft
            ? undefined
            : `${tooltip.xPx + 10}px`
          const rightPct = tooltip.flipLeft
            ? `calc(100% - ${tooltip.xPx - 10}px)`
            : undefined
          return (
            <div
              className="absolute top-2 pointer-events-none z-10"
              style={{ left: leftPct, right: rightPct, minWidth: '120px' }}
            >
              <div className="bg-gray-900/90 backdrop-blur-sm text-white rounded-lg px-2.5 py-2 shadow-lg border border-white/10 text-xs">
                <div className="font-bold font-mono mb-1.5 text-gray-200">{time}</div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-gray-300">Tide</span>
                  <span className="font-mono font-semibold ml-auto pl-2">{tideStr}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dirColor }} />
                  <span style={{ color: dirColor }} className="font-semibold">{dir}</span>
                  <span className="font-mono font-semibold ml-auto pl-2">{currStr}</span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Footer notes */}
      {corrDelta !== null && correctedSlacks.length > 0 && (
        <div className="text-xs text-gray-400 text-right mt-2">
          Correction Δ{corrDelta > 0 ? '+' : ''}{corrDelta}m applied · C = corrected slack
        </div>
      )}
      <div className="text-xs text-gray-400 mt-0.5">
        <span className="text-gray-300">Hover or tap chart</span> to see tide &amp; current at any time · S = slack
      </div>
    </div>
  )
}
