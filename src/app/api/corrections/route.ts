import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getCorrection, getAllCorrections } from '@/lib/corrections'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  if (siteId) {
    const correction = await getCorrection(siteId, token.id as string)
    return NextResponse.json({ correction })
  }

  const corrections = await getAllCorrections(token.id as string)
  return NextResponse.json({ corrections })
}