import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CommunityToggle from './CommunityToggle'

export default async function CommunityPage() {
  const session = await getServerSession(authOptions)
  const user = await prisma.user.findUnique({
    where:  { id: session!.user.id },
    select: { shareLogsWithCommunity: true },
  })

  const communityStats = await prisma.siteCorrection.findMany({
    where:   { userId: null, active: true },
    select:  { siteId: true, sampleSize: true, meanDelta: true, stdDev: true, confidence: true },
    orderBy: { sampleSize: 'desc' },
  })

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Community</h1>
      <p className="text-gray-500 mb-8">Help improve slack predictions for everyone by sharing your observations.</p>

      {/* Sharing toggle */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Share my dive logs</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              When enabled, your logged observations (dive site, date, and slack time delta) are anonymised
              and included in the community correction aggregates. Your name, email, and personal notes are
              never shared. You can withdraw at any time.
            </p>
          </div>
          <CommunityToggle initialValue={user?.shareLogsWithCommunity ?? false} />
        </div>
      </div>

      {/* Community stats */}
      <div className="section-head mb-4">Community correction data</div>
      {communityStats.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          No community corrections yet. Be the first to contribute.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Site</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Avg offset</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Std dev</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Observations</th>
              </tr>
            </thead>
            <tbody>
              {communityStats.map((row, i) => {
                const delta = Math.round(row.meanDelta)
                const cls = Math.abs(delta) < 5 ? 'text-tide-slack' : delta < 0 ? 'text-tide-teal' : 'text-tide-amber'
                return (
                  <tr key={row.siteId} className={i < communityStats.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.siteId}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${cls}`}>
                      {delta === 0 ? '±0m' : `${delta > 0 ? '+' : ''}${delta}m`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">±{Math.round(row.stdDev)}m</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{row.sampleSize}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Community corrections require a minimum of 10 observations per site before they are applied to dive plans.
        Data is aggregated and no individual log is identifiable in the output.
      </p>
    </div>
  )
}
