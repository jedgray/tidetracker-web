'use client'

import { useEffect, useRef } from 'react'

interface DataPoint {
  t: Date
  v: number
}

interface SlackEvent {
  t: Date
  type: string
}

interface HiloEvent {
  t: Date
  v: number
  type: string
}

interface Props {
  tideCurve:    DataPoint[]
  currCurve:    DataPoint[]   // signed — negative = ebb
  slackEvents:  SlackEvent[]
  hiloEvents:   HiloEvent[]
  correctedSlacks: Date[]     // corrected slack times to show as offset lines
  unitHeight:   string
  unitVelocity: string
  corrDelta:    number | null // minutes offset for correction annotation
}

const HEIGHT_CONV: Record<string, number> = { ft: 1, m: 0.3048 }
const VEL_CONV:    Record<string, number> = { kt: 1, mph: 1.15078, kph: 1.852, 'm/s': 0.514444 }

export default function BriefingChart({
  tideCurve, currCurve, slackEvents, hiloEvents,
  correctedSlacks, unitHeight, unitVelocity, corrDelta,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || !tideCurve.length) return

    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)

      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

      const hConv = HEIGHT_CONV[unitHeight] ?? 1
      const vConv = VEL_CONV[unitVelocity]  ?? 1

      const tVals = tideCurve.map(p => ({ x: p.t.getTime(), y: parseFloat((p.v * hConv).toFixed(unitHeight === 'm' ? 2 : 1)) }))
      const cVals = currCurve.map(p => ({ x: p.t.getTime(), y: parseFloat((p.v * vConv).toFixed(unitVelocity === 'm/s' ? 2 : 1)) }))

      const cAbsMax = Math.max(...currCurve.map(p => Math.abs(p.v) * vConv), 0.5)

      // Vertical line plugin — slacks, corrected slacks, and tidal extremes
      const vlinePlugin = {
        id: 'vlines',
        afterDraw(chart: any) {
          const { ctx, scales: { x, yLeft } } = chart
          const xMin = x.min, xMax = x.max, xSpan = xMax - xMin

          // Tidal extremes — dashed
          hiloEvents.forEach(ev => {
            const ms = ev.t.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath()
            ctx.setLineDash([3, 4])
            ctx.strokeStyle = ev.type === 'H' ? 'rgba(10,107,189,0.3)' : 'rgba(180,83,9,0.3)'
            ctx.lineWidth = 1
            ctx.moveTo(xi, yLeft.top)
            ctx.lineTo(xi, yLeft.bottom)
            ctx.stroke()
            ctx.restore()
          })

          // Harmonic slack — solid green
          slackEvents.filter(s => s.type === 'slack').forEach(sl => {
            const ms = sl.t.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(5,150,105,0.65)'
            ctx.lineWidth = 1.5
            ctx.moveTo(xi, yLeft.top)
            ctx.lineTo(xi, yLeft.bottom)
            ctx.stroke()
            ctx.fillStyle = 'rgba(5,150,105,0.85)'
            ctx.font = 'bold 9px system-ui'
            ctx.fillText('S', xi + 3, yLeft.top + 10)
            ctx.restore()
          })

          // Corrected slacks — amber dashed
          correctedSlacks.forEach(ct => {
            const ms = ct.getTime()
            if (ms < xMin || ms > xMax) return
            const xi = x.left + (ms - xMin) / xSpan * (x.right - x.left)
            ctx.save()
            ctx.beginPath()
            ctx.setLineDash([4, 3])
            ctx.strokeStyle = 'rgba(180,83,9,0.7)'
            ctx.lineWidth = 1.5
            ctx.moveTo(xi, yLeft.top)
            ctx.lineTo(xi, yLeft.bottom)
            ctx.stroke()
            ctx.fillStyle = 'rgba(180,83,9,0.85)'
            ctx.font = 'bold 9px system-ui'
            ctx.fillText('C', xi + 3, yLeft.top + 22)
            ctx.restore()
          })
        },
      }

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'line',
        plugins: [vlinePlugin],
        data: {
          datasets: [
            {
              label: `Tide height (${unitHeight})`,
              data: tVals,
              borderColor:     '#1a73e8',
              borderWidth:     2,
              backgroundColor: 'rgba(26,115,232,0.06)',
              fill:            true,
              pointRadius:     0,
              tension:         0.4,
              yAxisID:         'yLeft',
              parsing:         false,
            },
            {
              label: `Current velocity (${unitVelocity})`,
              data: cVals,
              borderColor: '#00897b',
              borderWidth: 1.5,
              borderDash:  [5, 4],
              fill:        false,
              pointRadius: 0,
              tension:     0.4,
              yAxisID:     'yRight',
              parsing:     false,
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
          responsive:          true,
          maintainAspectRatio: false,
          animation:           false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: items => {
                 const x = items[0]?.parsed?.x
                 if (x == null) return ''
                 const d = new Date(x as number)
                 return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                },
                label: item => {
                  const y = item.parsed?.y
                  if (y == null) return ''
                  if (item.datasetIndex === 0) return `Tide: ${y.toFixed(unitHeight === 'm' ? 2 : 1)} ${unitHeight}`
                  const dir = Math.abs(y) < 0.05 ? 'Slack' : y > 0 ? 'Flood' : 'Ebb'
                  return `${dir}: ${Math.abs(y).toFixed(unitVelocity === 'm/s' ? 2 : 1)} ${unitVelocity}`
                },
              },
            },
          },
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
                maxTicksLimit: 10,
                font: { size: 9 },
                color: '#8b96a8',
              },
              grid: { color: 'rgba(0,0,0,0.04)' },
            },
            yLeft: {
              type:     'linear',
              position: 'left',
              title: {
                display: true,
                text:    `Height (${unitHeight})`,
                color:   '#1a73e8',
                font:    { size: 9, weight: 'bold' as const },
              },
              ticks: {
                callback: v => `${parseFloat(String(v)).toFixed(unitHeight === 'm' ? 1 : 1)} ${unitHeight}`,
                font:  { size: 9 },
                color: '#1a73e8',
              },
              grid: { color: 'rgba(0,0,0,0.04)' },
            },
            yRight: {
              type:     'linear',
              position: 'right',
              min:      -cAbsMax * 1.2,
              max:       cAbsMax * 1.2,
              title: {
                display: true,
                text:    `Velocity (${unitVelocity})`,
                color:   '#00897b',
                font:    { size: 9, weight: 'bold' as const },
              },
              ticks: {
                callback: v => {
                  const val = parseFloat(String(v))
                  if (Math.abs(val) < cAbsMax * 0.05) return `0 ${unitVelocity}`
                  return `${val > 0 ? '+' : ''}${val.toFixed(unitVelocity === 'm/s' ? 2 : 1)}`
                },
                font:         { size: 9 },
                color:        '#00897b',
                maxTicksLimit: 7,
              },
              grid: { drawOnChartArea: false },
            },
          },
        },
      })
    })

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [tideCurve, currCurve, unitHeight, unitVelocity]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Tide &amp; current overlay</div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-4 h-0.5 bg-tide-blue" />
            Tide height
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-4 h-0.5 bg-tide-teal border-dashed border-t border-tide-teal" />
            Current velocity
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-4 h-0.5 bg-tide-slack" />
            Slack (S)
          </div>
          {correctedSlacks.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-4 h-0.5 bg-tide-amber border-dashed border-t border-tide-amber" />
              Corrected (C)
            </div>
          )}
        </div>
      </div>
      <div className="relative" style={{ height: '220px' }}>
        <canvas ref={canvasRef} />
      </div>
      {corrDelta !== null && correctedSlacks.length > 0 && (
        <div className="text-xs text-gray-400 text-right mt-2">
          Correction Δ{corrDelta > 0 ? '+' : ''}{corrDelta}m applied · amber dashed lines show corrected slack times
        </div>
      )}
      <div className="text-xs text-gray-400 text-right">
        Left axis = tide height · Right axis = current velocity · S = harmonic slack
      </div>
    </div>
  )
}
