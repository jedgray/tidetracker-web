import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  unitHeight:   z.enum(['ft', 'm']).optional(),
  unitVelocity: z.enum(['kt', 'mph', 'kph', 'm/s']).optional(),
  name:         z.string().min(1).max(100).optional(),
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
    data:   parsed.data,
    select: { unitHeight: true, unitVelocity: true, name: true },
  })
  return NextResponse.json({ user })
}
