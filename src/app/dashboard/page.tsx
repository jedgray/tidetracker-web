import { requireAuth } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const user = await requireAuth()
  const [logCount, corrCount] = await Promise.all([
    prisma.diveLog.count({ where: { userId: user.id } }),
    prisma.siteCorrection.count({ where: { userId: user.id, active: true } }),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = user.name?.split(' ')[0] ?? 'diver'

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{greeting}, {name}</h1>
      <p className="text-gray-500 mb-6">Puget Sound &amp; Salish Sea dive planning</p>

      {/* Quick stats — 2-col on mobile, 3-col on md+ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 leading-tight">Dives logged</div>
          <div className="text-3xl font-bold font-mono text-tide-blue">{logCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 leading-tight">Corrections</div>
          <div className="text-3xl font-bold font-mono text-tide-slack">{corrCount}</div>
          <div className="text-xs text-gray-400 mt-1">10+ obs</div>
        </div>
        <div className="card p-4 col-span-2 md:col-span-1">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 leading-tight">Dive sites</div>
          <div className="text-3xl font-bold font-mono text-gray-700">14</div>
          <div className="text-xs text-gray-400 mt-1">Puget Sound &amp; Strait</div>
        </div>
      </div>

      {/* Quick actions — stack on mobile, 2-col on md+ */}
      <div className="section-head mb-4">Start planning</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a href="/dashboard/planner" className="card p-5 hover:border-tide-blue transition-colors cursor-pointer group flex gap-4 md:block">
          <div className="w-9 h-9 rounded-lg bg-tide-blue-lt flex items-center justify-center flex-shrink-0 md:mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a6bbd" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
              <path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 group-hover:text-tide-blue transition-colors mb-1">Dive planner</div>
            <p className="text-sm text-gray-500">Select a site, fetch predictions, and get a full dive briefing with corrected slack times.</p>
          </div>
        </a>
        <a href="/dashboard/log" className="card p-5 hover:border-tide-blue transition-colors cursor-pointer group flex gap-4 md:block">
          <div className="w-9 h-9 rounded-lg bg-tide-teal-lt flex items-center justify-center flex-shrink-0 md:mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00897b" strokeWidth="2" strokeLinecap="round">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/>
              <path d="M11 13l9-9"/><path d="M15 3h6v6"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 group-hover:text-tide-blue transition-colors mb-1">Log a dive</div>
            <p className="text-sm text-gray-500">Record observed conditions and slack time — contributes to site-specific corrections.</p>
          </div>
        </a>
      </div>
    </div>
  )
}
