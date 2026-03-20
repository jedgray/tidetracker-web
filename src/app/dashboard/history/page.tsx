import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import HistoryList from './HistoryList'

export default async function HistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')
  const logs = await prisma.diveLog.findMany({
    where:   { userId: session.user.id as string },
    orderBy: { diveDate: 'desc' },
    take:    100,
  })

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dive history</h1>
          <p className="text-gray-500 mt-0.5">{logs.length} dive{logs.length !== 1 ? 's' : ''} logged</p>
        </div>
        <a href="/api/dive-logs/export" className="btn-secondary text-sm">Export CSV</a>
      </div>
      {logs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm">No dives logged yet.</p>
          <a href="/dashboard/log" className="btn-primary mt-4 inline-flex">Log your first dive</a>
        </div>
      ) : (
        <HistoryList logs={logs} />
      )}
    </div>
  )
}
