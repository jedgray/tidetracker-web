import { prisma } from '@/lib/prisma'

export const MIN_OBSERVATIONS = 10

export interface CorrectionResult {
  active:     boolean
  n:          number
  needed:     number
  meanDelta:  number | null  // signed minutes
  stdDev:     number | null
  minDelta:   number | null
  maxDelta:   number | null
  confidence: number | null  // 0.0 – 1.0
  source:     'personal' | 'community' | null
}

// Confidence formula:
//   - 0.4 base at MIN_OBSERVATIONS
//   - +0.4 as n scales from MIN to 30
//   - +0.2 spread bonus: penalised when stdDev > 40 min
function computeConfidence(n: number, stdDev: number): number {
  const sizeFactor   = Math.min((n - MIN_OBSERVATIONS) / 20, 1)
  const spreadFactor = Math.max(0, 1 - stdDev / 40)
  return parseFloat((0.4 + sizeFactor * 0.4 + spreadFactor * 0.2).toFixed(3))
}

// Recompute and upsert a SiteCorrection row from raw DiveLog data.
// Called after every new log save.
export async function recomputeCorrection(
  siteId:        string,
  userId:        string | null,   // null = community aggregate
  currStationId: string,
  tideStationId: string,
): Promise<void> {
  const where = userId
    ? { userId, siteId, deltaMinutes: { not: null } }
    : {
        siteId,
        deltaMinutes: { not: null },
        sharedWithCommunity: true,
        user: { shareLogsWithCommunity: true },
      }

  const logs = await prisma.diveLog.findMany({
    where,
    select: { deltaMinutes: true },
  })

  const deltas = logs
    .map(l => l.deltaMinutes)
    .filter((d): d is number => d !== null)

  const n = deltas.length
  const active = n >= MIN_OBSERVATIONS

  if (n === 0) {
    // Remove stale correction if all logs were deleted
    await prisma.siteCorrection.deleteMany({
      where: { siteId, userId },
    })
    return
  }

  const mean    = deltas.reduce((a, b) => a + b, 0) / n
  const variance = deltas.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n
  const stdDev  = Math.sqrt(variance)

  await prisma.siteCorrection.upsert({
    where:  { siteId_userId: { siteId, userId: userId ?? '' } },
    create: {
      siteId,
      userId,
      currStationId,
      tideStationId,
      sampleSize: n,
      meanDelta:  mean,
      stdDev,
      minDelta:   Math.min(...deltas),
      maxDelta:   Math.max(...deltas),
      confidence: active ? computeConfidence(n, stdDev) : 0,
      active,
    },
    update: {
      sampleSize: n,
      meanDelta:  mean,
      stdDev,
      minDelta:   Math.min(...deltas),
      maxDelta:   Math.max(...deltas),
      confidence: active ? computeConfidence(n, stdDev) : 0,
      active,
      updatedAt:  new Date(),
    },
  })
}

// Load the best available correction for a site + user.
// Prefers personal correction if active, falls back to community.
export async function getCorrection(
  siteId: string,
  userId: string,
): Promise<CorrectionResult> {
  const [personal, community] = await Promise.all([
    prisma.siteCorrection.findUnique({ where: { siteId_userId: { siteId, userId } } }),
    prisma.siteCorrection.findUnique({ where: { siteId_userId: { siteId, userId: '' } } }),
  ])

  // Personal correction takes precedence when active
  const source = personal?.active ? personal : community?.active ? community : null
  const partial = personal ?? community ?? null

  if (source) {
    return {
      active:     true,
      n:          source.sampleSize,
      needed:     0,
      meanDelta:  Math.round(source.meanDelta),
      stdDev:     Math.round(source.stdDev),
      minDelta:   source.minDelta,
      maxDelta:   source.maxDelta,
      confidence: source.confidence,
      source:     source === personal ? 'personal' : 'community',
    }
  }

  return {
    active:     false,
    n:          partial?.sampleSize ?? 0,
    needed:     MIN_OBSERVATIONS - (partial?.sampleSize ?? 0),
    meanDelta:  null,
    stdDev:     null,
    minDelta:   null,
    maxDelta:   null,
    confidence: null,
    source:     null,
  }
}

// Batch load corrections for all sites — used on the dashboard.
export async function getAllCorrections(userId: string) {
  const rows = await prisma.siteCorrection.findMany({
    where: {
      OR: [{ userId }, { userId: '' }],
    },
  })
  // Group by siteId, preferring personal over community
  const map: Record<string, CorrectionResult> = {}
  rows.forEach(row => {
    const existing = map[row.siteId]
    const isPersonal = row.userId === userId
    if (!existing || isPersonal) {
      map[row.siteId] = {
        active:     row.active,
        n:          row.sampleSize,
        needed:     Math.max(0, MIN_OBSERVATIONS - row.sampleSize),
        meanDelta:  row.active ? Math.round(row.meanDelta) : null,
        stdDev:     row.active ? Math.round(row.stdDev)   : null,
        minDelta:   row.minDelta,
        maxDelta:   row.maxDelta,
        confidence: row.confidence,
        source:     isPersonal ? 'personal' : 'community',
      }
    }
  })
  return map
}
