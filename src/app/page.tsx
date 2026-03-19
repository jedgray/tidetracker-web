import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.disclaimerAccepted) {
    redirect('/dashboard')
  }
  if (session && !session.user?.disclaimerAccepted) {
    redirect('/auth/onboarding')
  }
  redirect('/auth/signin')
}
