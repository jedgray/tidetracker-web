import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NavSidebar from '@/components/ui/NavSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (!session.user.disclaimerAccepted) redirect('/auth/onboarding')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <NavSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
