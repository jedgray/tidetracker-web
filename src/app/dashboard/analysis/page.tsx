import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAllCorrections, MIN_OBSERVATIONS } from '@/lib/corrections'

export default async function AnalysisPage() {
  const session = await getServerSession(authOptions)
  const userId  = session!.user.id

  const [corrections, logs] = await Promise.all([
    getAllCorrections(userId),
    prisma.diveLog.findMany({
      where:  { userId, deltaMinutes: { not: null } },
      select: { siteId: true, siteName: true, deltaMinutes: true },
    }),
  ])

  const totalLogs   = await prisma.diveLog.count({ where: { userId } })
  const withDelta   = logs.length
  const allDeltas   = logs.map(l => l.deltaMinutes as number)
  const avgDelta    = withDelta ? Math.round(allDeltas.reduce((a,b) => a+b, 0) / withDelta) : null

  const ratedLogs = await prisma.diveLog.findMany({
    where:  { userId, rating: { not: null } },
    select: { rating: true },
  })
  const avgRating = ratedLogs.length
    ? (ratedLogs.reduce((a,b) => a + (b.rating ?? 0), 0) / ratedLogs.length).toFixed(1)
    : null

  // Distribution buckets
  const bins = { early30: 0, early5: 0, ontime: 0, late5: 0, late30: 0 }
  allDeltas.forEach(d => {
    if      (d < -30)           bins.early30++
    else if (d < -5)            bins.early5++
    else if (Math.abs(d) <= 5)  bins.ontime++
    else if (d <= 30)           bins.late5++
    else                        bins.late30++
  })

  const activeSites = Object.entries(corrections).filter(([, c]) => c.active)
  const pendingSites = Object.entries(corrections).filter(([, c]) => !c.active && c.n > 0)

  function confLabel(confidence: number | null) {
    if (!confidence) return 'Low'
    const n = Math.round(confidence * 5)
    return ['Low', 'Fair', 'Moderate', 'Good', 'High'][n - 1] ?? 'Low'
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Slack analysis</h1>
      <p className="text-gray-500 mb-8">
        Built from {totalLogs} logged dive{totalLogs !== 1 ? 's' : ''},
        {' '}{withDelta} with observed slack data.
        Site corrections activate at {MIN_OBSERVATIONS}+ observations.
      </p>

      {/* Fleet stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Avg slack offset</div>
          <div className={`text-2xl font-bold font-mono ${avgDelta === null ? 'text-gray-300' : Math.abs(avgDelta) < 5 ? 'text-tide-slack' : avgDelta < 0 ? 'text-tide-teal' : 'text-tide-amber'}`}>
            {avgDelta === null ? '—' : `${avgDelta > 0 ? '+' : ''}${avgDelta}m`}
          </div>
          <div className="text-xs text-gray-400 mt-1">across all sites</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Plan accuracy</div>
          <div className={`text-2xl font-bold font-mono ${!avgRating ? 'text-gray-300' : parseFloat(avgRating) >= 4 ? 'text-tide-slack' : parseFloat(avgRating) >= 3 ? 'text-tide-teal' : 'text-tide-amber'}`}>
            {avgRating ?? '—'}{avgRating ? ' / 5' : ''}
          </div>
          <div className="text-xs text-gray-400 mt-1">{ratedLogs.length} rated</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Active corrections</div>
          <div className="text-2xl font-bold font-mono text-tide-slack">{activeSites.length}</div>
          <div className="text-xs text-gray-400 mt-1">{pendingSites.length} pending</div>
        </div>
      </div>

      {/* Distribution */}
      {withDelta > 0 && (
        <>
          <div className="section-head mb-4">Slack offset distribution</div>
          <div className="card p-4 mb-8">
            <div className="flex items-end gap-3 h-20">
              {[
                { label: '>30m early', val: bins.early30, cls: 'bg-tide-teal'    },
                { label: '5–30m early',val: bins.early5,  cls: 'bg-tide-teal-lt' },
                { label: 'On time',    val: bins.ontime,  cls: 'bg-tide-slack'   },
                { label: '5–30m late', val: bins.late5,   cls: 'bg-tide-amber-lt'},
                { label: '>30m late',  val: bins.late30,  cls: 'bg-tide-amber'   },
              ].map(b => {
                const maxVal = Math.max(bins.early30, bins.early5, bins.ontime, bins.late5, bins.late30, 1)
                const pct    = Math.round((b.val / maxVal) * 100)
                return (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold font-mono text-gray-600">{b.val}</span>
                    <div className="w-full flex items-end" style={{ height: '48px' }}>
                      <div
                        className={`w-full rounded-t ${b.cls}`}
                        style={{ height: `${Math.max(pct, b.val > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 text-center leading-tight">{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Per-site corrections */}
      <div className="section-head mb-4">Site correction factors</div>
      {activeSites.length === 0 && pendingSites.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Log dives with observed slack times to build per-site corrections.
        </div>
      ) : (
        <div className="card overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Site</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Avg offset</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Std dev</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Obs</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Confidence</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...activeSites, ...pendingSites].map(([siteId, corr], i) => {
                const total = activeSites.length + pendingSites.length
                const rowBorder = i < total - 1 ? 'border-b border-gray-50' : ''
                const deltaVal = corr.meanDelta
                const deltaStr = deltaVal === null ? '—'
                  : Math.abs(deltaVal) < 5 ? '±0m'
                  : `${deltaVal > 0 ? '+' : ''}${deltaVal}m`
                const deltaCls = !corr.active ? 'text-gray-300' :
                  deltaVal === null || Math.abs(deltaVal) < 5 ? 'text-tide-slack' :
                  deltaVal < 0 ? 'text-tide-teal' : 'text-tide-amber'
                return (
                  <tr key={siteId} className={rowBorder}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{siteId}</div>
                      {!corr.active && (
                        <div className="text-xs text-gray-400">{corr.n}/{MIN_OBSERVATIONS} obs · pending</div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${deltaCls}`}>{deltaStr}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      {corr.stdDev !== null ? `±${corr.stdDev}m` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{corr.n}</td>
                    <td className="px-4 py-3 text-right">
                      {corr.active ? (
                        <span className="text-xs font-semibold text-gray-600">
                          {confLabel(corr.confidence)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {corr.source ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          corr.source === 'personal' ? 'bg-tide-blue-lt text-tide-blue-dk' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {corr.source}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        Personal corrections use only your own observations. Community corrections aggregate anonymised data
        from all users who have opted in. Personal corrections take precedence when both are available.
        A future release will add tidal exchange range as a covariate to improve correction accuracy further.
      </p>
    </div>
  )
}
