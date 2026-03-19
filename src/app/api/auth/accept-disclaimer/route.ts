import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  if (!body.accepted) {
    return NextResponse.json({ error: 'Disclaimer must be accepted' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      disclaimerAccepted:   true,
      disclaimerAcceptedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
