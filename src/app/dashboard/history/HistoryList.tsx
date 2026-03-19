'use client'

import { useState } from 'react'
import type { DiveLog } from '@prisma/client'

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDelta(mins: number | null) {
  if (mins === null) return null
  const abs = Math.abs(mins)
  const h = Math.floor(abs / 60), m = abs % 60
  const str = h > 0 ? `${h}h ${m}m` : `${m}m`
  if (Math.abs(mins) < 5) return { text: '±0m on time', cls: 'bg-tide-slack-lt text-tide-slack-dk' }
  return mins < 0
    ? { text: `${str} early`, cls: 'bg-tide-teal-lt text-tide-teal-dk' }
    : { text: `${str} late`,  cls: 'bg-tide-amber-lt text-tide-amber'   }
}

export default function HistoryList({ logs: initial }: { logs: DiveLog[] }) {
  const [logs, setLogs] = useState(initial)

  async function remove(id: string) {
    if (!confirm('Remove this dive log?')) return
    const res = await fetch(`/api/dive-logs/${id}`, { method: 'DELETE' })
    if (res.ok) setLogs(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const dd = fmtDelta(log.deltaMinutes)
        const condCls: Record<string, string> = {
          better:        'bg-tide-slack-lt text-tide-slack-dk',
          'as-predicted':'bg-tide-blue-lt text-tide-blue-dk',
          worse:         'bg-red-50 text-red-700',
          'no-plan':     'bg-gray-100 text-gray-500',
        }
        return (
          <div key={log.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900">{log.siteName}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{fmtDate(log.diveDate)}</div>
              </div>
              <button
                onClick={() => remove(log.id)}
                className="text-xs text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 border border-gray-100 hover:border-red-200 rounded px-2 py-1"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {log.rating && (
                <span className="text-amber-400 text-sm">{'★'.repeat(log.rating)}{'☆'.repeat(5 - log.rating)}</span>
              )}
              {dd && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dd.cls}`}>{dd.text}</span>
              )}
              {log.conditions && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${condCls[log.conditions] ?? 'bg-gray-100 text-gray-600'}`}>
                  {log.conditions === 'better' ? 'Better than plan'
                   : log.conditions === 'as-predicted' ? 'As predicted'
                   : log.conditions === 'worse' ? 'Worse than plan'
                   : 'No plan'}
                </span>
              )}
              {log.currentStrengthLabel && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{log.currentStrengthLabel} current</span>
              )}
              {log.sharedWithCommunity && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-tide-slack-lt text-tide-slack-dk">Shared</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {log.plannedSlack && (
                <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Planned slack</div>
                  <div className="font-mono font-semibold text-sm">{log.plannedSlack}</div>
                </div>
              )}
              {log.observedSlack && (
                <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Observed slack</div>
                  <div className="font-mono font-semibold text-sm">{log.observedSlack}</div>
                </div>
              )}
              {log.visibilityFt && (
                <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Visibility</div>
                  <div className="font-mono font-semibold text-sm">{log.visibilityFt} ft</div>
                </div>
              )}
              {log.maxDepthFt && (
                <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Max depth</div>
                  <div className="font-mono font-semibold text-sm">{log.maxDepthFt} ft</div>
                </div>
              )}
            </div>

            {log.notes && (
              <div className="text-sm text-gray-600 italic bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                {log.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
