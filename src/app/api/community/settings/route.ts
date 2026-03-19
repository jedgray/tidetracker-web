import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  shareLogsWithCommunity: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  { shareLogsWithCommunity: parsed.data.shareLogsWithCommunity },
    select: { shareLogsWithCommunity: true },
  })

  return NextResponse.json({ shareLogsWithCommunity: user.shareLogsWithCommunity })
}
