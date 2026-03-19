import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MIN_OBSERVATIONS } from '@/lib/corrections'

// Public endpoint — returns active community corrections only.
// No personal data is exposed; userId is null for community rows.
export async function GET() {
  const corrections = await prisma.siteCorrection.findMany({
    where: {
      userId: null,  // community aggregates only
      active: true,
    },
    select: {
      siteId:        true,
      currStationId: true,
      tideStationId: true,
      sampleSize:    true,
      meanDelta:     true,
      stdDev:        true,
      confidence:    true,
      updatedAt:     true,
    },
    orderBy: { sampleSize: 'desc' },
  })

  return NextResponse.json({
    corrections,
    minObservations: MIN_OBSERVATIONS,
  })
}
