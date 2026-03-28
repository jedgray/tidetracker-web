import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DiveLogForm from './DiveLogForm'

export default async function LogPage() {
  const session = await getServerSession(authOptions)
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Log a dive</h1>
      <p className="text-gray-500 mb-8">
        Record observed conditions and how they compared to the plan.
        Slack time observations build site-specific correction factors.
      </p>
      <DiveLogForm
        unitHeight={session?.user.unitHeight ?? 'ft'}
        unitVelocity={session?.user.unitVelocity ?? 'kt'}
      />
    </div>
  )
}
