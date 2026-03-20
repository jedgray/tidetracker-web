import { requireAuth } from '@/lib/session'
import { getAllCorrections } from '@/lib/corrections'
import { prisma } from '@/lib/prisma'
import PlannerClient from './PlannerClient'

export default async function PlannerPage() {
  const user = await requireAuth()

  // Load sites and corrections in parallel
  const [sites, corrections] = await Promise.all([
    prisma.diveSite.findMany({
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    }),
    getAllCorrections(user.id),
  ])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dive planner</h1>
      <p className="text-gray-500 mb-8">
        Select a site, choose a date, and get a full briefing with live NOAA predictions.
      </p>
      <PlannerClient
        sites={sites}
        corrections={corrections}
        unitHeight={user.unitHeight}
        unitVelocity={user.unitVelocity}
      />
    </div>
  )
}
