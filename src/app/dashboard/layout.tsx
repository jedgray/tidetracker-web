import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NavSidebar from '@/components/ui/NavSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  console.log('[layout] session.user.id:', session.user.id)
  console.log('[layout] session.user:', JSON.stringify(session.user))

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { disclaimerAccepted: true, id: true, email: true },
  })

  console.log('[layout] db user:', JSON.stringify(user))

  if (!user?.disclaimerAccepted) {
    console.log('[layout] redirecting to onboarding — disclaimerAccepted is:', user?.disclaimerAccepted)
    redirect('/auth/onboarding')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <NavSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}