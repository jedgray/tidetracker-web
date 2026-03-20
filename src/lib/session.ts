import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export interface AuthUser {
  id:                 string
  name?:              string | null
  email?:             string | null
  image?:             string | null
  disclaimerAccepted: boolean
  unitHeight:         string
  unitVelocity:       string
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/signin')
  return session.user as AuthUser
}