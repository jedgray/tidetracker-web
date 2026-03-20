import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id as string },
    select: {
      name:                 true,
      email:                true,
      unitHeight:           true,
      unitVelocity:         true,
      disclaimerAccepted:   true,
      disclaimerAcceptedAt: true,
      shareLogsWithCommunity: true,
      createdAt:            true,
    },
  })
  if (!user) return null

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 mb-8">Account and display preferences</p>
      <SettingsForm user={user} />
    </div>
  )
}
