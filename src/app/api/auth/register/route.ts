import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { DISCLAIMER_VERSION } from '@/lib/disclaimer'

const registerSchema = z.object({
  name:               z.string().min(1).max(100),
  email:              z.string().email(),
  password:           z.string().min(8, 'Password must be at least 8 characters'),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the disclaimer to create an account' }),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        disclaimerAccepted:   true,
        disclaimerAcceptedAt: new Date(),
      },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
