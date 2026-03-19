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

  // Check disclaimer directly from DB — never rely on the JWT token
  // for this since tokens are cached and may be stale
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { disclaimerAccepted: true },
  })

  if (!user?.disclaimerAccepted) {
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