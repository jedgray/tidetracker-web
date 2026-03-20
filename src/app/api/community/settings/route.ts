import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const schema = z.object({
  shareLogsWithCommunity: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where:  { id: token.id as string },
    data:   { shareLogsWithCommunity: parsed.data.shareLogsWithCommunity },
    select: { shareLogsWithCommunity: true },
  })

  return NextResponse.json({ shareLogsWithCommunity: user.shareLogsWithCommunity })
}