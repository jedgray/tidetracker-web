import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Use getToken instead of getServerSession — more reliable in route handlers
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.accepted) {
      return NextResponse.json({ error: 'Disclaimer must be accepted' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: token.id as string },
      data: {
        disclaimerAccepted:   true,
        disclaimerAcceptedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[accept-disclaimer]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}