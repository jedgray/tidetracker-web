export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recomputeCorrection } from '@/lib/corrections'

const createLogSchema = z.object({
  siteId:               z.string().min(1),
  siteName:             z.string().min(1),
  region:               z.string().min(1),
  diveDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime:            z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  exitTime:             z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  maxDepthFt:           z.number().int().min(0).max(500).nullable().optional(),
  plannedSlack:         z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observedSlack:        z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  deltaMinutes:         z.number().int().min(-300).max(300).nullable().optional(),
  currStationId:        z.string().nullable().optional(),
  currStationName:      z.string().nullable().optional(),
  tideStationId:        z.string().nullable().optional(),
  tideStationName:      z.string().nullable().optional(),
  visibilityFt:         z.number().int().min(0).max(200).nullable().optional(),
  waterTempF:           z.number().int().min(28).max(85).nullable().optional(),
  currentStrength:      z.number().int().min(0).max(4).nullable().optional(),
  currentStrengthLabel: z.string().nullable().optional(),
  conditions:           z.enum(['better', 'as-predicted', 'worse', 'no-plan']).nullable().optional(),
  rating:               z.number().int().min(1).max(5).nullable().optional(),
  notes:                z.string().max(2000).nullable().optional(),
  sharedWithCommunity:  z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const [logs, total] = await Promise.all([
    prisma.diveLog.findMany({
      where: {
        userId: session.user.id,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { diveDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.diveLog.count({
      where: {
        userId: session.user.id,
        ...(siteId ? { siteId } : {}),
      },
    }),
  ])

  return NextResponse.json({ logs, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (!session.user.disclaimerAccepted) {
    return NextResponse.json({ error: 'Disclaimer not accepted' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    )
  }

  const data = parsed.data
  const [y, m, d] = data.diveDate.split('-').map(Number)

  const log = await prisma.diveLog.create({
    data: {
      userId:               session.user.id,
      siteId:               data.siteId,
      siteName:             data.siteName,
      region:               data.region,
      diveDate:             new Date(y, m - 1, d),
      entryTime:            data.entryTime ?? null,
      exitTime:             data.exitTime  ?? null,
      maxDepthFt:           data.maxDepthFt ?? null,
      plannedSlack:         data.plannedSlack  ?? null,
      observedSlack:        data.observedSlack ?? null,
      deltaMinutes:         data.deltaMinutes  ?? null,
      currStationId:        data.currStationId   ?? null,
      currStationName:      data.currStationName ?? null,
      tideStationId:        data.tideStationId   ?? null,
      tideStationName:      data.tideStationName ?? null,
      visibilityFt:         data.visibilityFt   ?? null,
      waterTempF:           data.waterTempF     ?? null,
      currentStrength:      data.currentStrength      ?? null,
      currentStrengthLabel: data.currentStrengthLabel ?? null,
      conditions:           data.conditions ?? null,
      rating:               data.rating ?? null,
      notes:                data.notes  ?? null,
      sharedWithCommunity:  data.sharedWithCommunity ?? false,
    },
  })

  // Recompute personal correction async (don't block the response)
  if (data.deltaMinutes !== null && data.deltaMinutes !== undefined &&
      data.currStationId && data.tideStationId) {
    recomputeCorrection(
      data.siteId,
      session.user.id,
      data.currStationId,
      data.tideStationId,
    ).catch(console.error)

    // Also recompute community aggregate if user opted in and log is shared
    if (data.sharedWithCommunity) {
      const user = await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { shareLogsWithCommunity: true },
      })
      if (user?.shareLogsWithCommunity) {
        recomputeCorrection(
          data.siteId,
          null,
          data.currStationId,
          data.tideStationId,
        ).catch(console.error)
      }
    }
  }

  return NextResponse.json({ log }, { status: 201 })
}
