import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCorrection, getAllCorrections } from '@/lib/corrections'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  if (siteId) {
    const correction = await getCorrection(siteId, session.user.id)
    return NextResponse.json({ correction })
  }

  const corrections = await getAllCorrections(session.user.id)
  return NextResponse.json({ corrections })
}
