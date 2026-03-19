import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recomputeCorrection } from '@/lib/corrections'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const log = await prisma.diveLog.findUnique({ where: { id: params.id } })
  if (!log) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (log.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.diveLog.delete({ where: { id: params.id } })

  // Recompute corrections after deletion
  if (log.currStationId && log.tideStationId) {
    recomputeCorrection(log.siteId, session.user.id, log.currStationId, log.tideStationId)
      .catch(console.error)
    if (log.sharedWithCommunity) {
      recomputeCorrection(log.siteId, null, log.currStationId, log.tideStationId)
        .catch(console.error)
    }
  }

  return NextResponse.json({ ok: true })
}
