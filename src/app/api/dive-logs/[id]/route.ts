import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recomputeCorrection } from '@/lib/corrections'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
if (!token?.id) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}

  const log = await prisma.diveLog.findUnique({ where: { id: params.id } })
  if (!log) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (log.userId !== token.id as string) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.diveLog.delete({ where: { id: params.id } })

  // Recompute corrections after deletion
  if (log.currStationId && log.tideStationId) {
    recomputeCorrection(log.siteId, token.id as string, log.currStationId, log.tideStationId)
      .catch(console.error)
    if (log.sharedWithCommunity) {
      recomputeCorrection(log.siteId, null, log.currStationId, log.tideStationId)
        .catch(console.error)
    }
  }

  return NextResponse.json({ ok: true })
}
