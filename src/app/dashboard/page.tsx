import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')
  const [logCount, corrCount] = await Promise.all([
    prisma.diveLog.count({ where: { userId: session.user.id as string } }),
    prisma.siteCorrection.count({ where: { userId: session.user.id as string, active: true } }),
  ])

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const name = session?.user.name?.split(' ')[0] ?? 'diver'

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{greeting}, {name}</h1>
      <p className="text-gray-500 mb-8">Puget Sound &amp; Salish Sea dive planning</p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Dives logged</div>
          <div className="text-3xl font-bold font-mono text-tide-blue">{logCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Active corrections</div>
          <div className="text-3xl font-bold font-mono text-tide-slack">{corrCount}</div>
          <div className="text-xs text-gray-400 mt-1">sites with 10+ obs</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Dive sites</div>
          <div className="text-3xl font-bold font-mono text-gray-700">14</div>
          <div className="text-xs text-gray-400 mt-1">Puget Sound &amp; Strait</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-head mb-4">Start planning</div>
      <div className="grid grid-cols-2 gap-4">
        <a href="/dashboard/planner" className="card p-5 hover:border-tide-blue transition-colors cursor-pointer group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-tide-blue-lt flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a6bbd" strokeWidth="2" strokeLinecap="round"><path d="M2 12c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/><path d="M2 17c1.5-2 3-3 5-3s3.5 1 5 1 3.5-1 5-1 3.5 1 5 3"/></svg>
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-tide-blue transition-colors">Dive planner</span>
          </div>
          <p className="text-sm text-gray-500">Select a site, fetch predictions, and get a full dive briefing with corrected slack times.</p>
        </a>
        <a href="/dashboard/log" className="card p-5 hover:border-tide-blue transition-colors cursor-pointer group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-tide-teal-lt flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00897b" strokeWidth="2" strokeLinecap="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/><path d="M11 13l9-9"/><path d="M15 3h6v6"/></svg>
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-tide-blue transition-colors">Log a dive</span>
          </div>
          <p className="text-sm text-gray-500">Record observed conditions and slack time — contributes to site-specific corrections.</p>
        </a>
      </div>
    </div>
  )
}
