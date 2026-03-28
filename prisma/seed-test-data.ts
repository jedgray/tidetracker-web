/**
 * Seed script: test dive log data
 *
 * Creates realistic dive log entries for three sites, crossing the 10-observation
 * threshold so corrections activate. Includes deliberate outliers to test engine
 * robustness.
 *
 * Usage (from project root, with DATABASE_URL set):
 *   npx tsx prisma/seed-test-data.ts [email]
 *
 * If no email is provided it looks for the first user in the database.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Box-Muller normal distribution: mean ± stdDev, clamped to [min, max] */
function randNormal(mean: number, stdDev: number, min: number, max: number): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return Math.min(max, Math.max(min, Math.round(mean + stdDev * n)))
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Generate a date n days ago at a random hour */
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(randInt(6, 18), 0, 0, 0)
  return d
}

/** Format HH:MM from a base time + offset minutes */
function timeFromBase(baseHour: number, baseMin: number, offsetMins: number): string {
  const total = baseHour * 60 + baseMin + offsetMins
  const h = Math.floor(((total % 1440) + 1440) % 1440 / 60)
  const m = ((total % 60) + 60) % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

// ── Site definitions ───────────────────────────────────────────────────────────

const SITES = {
  threetree: {
    id:             'threetree',
    name:           'Three Tree Point',
    region:         'Central Sound',
    currStationId:  'PUG1501',
    currStationName:'Rich Passage',
    tideStationId:  '9447130',
    tideStationName:'Seattle',
    // This site runs consistently late — strong tidal influence
    meanDelta:      10,
    stdDev:         6,
  },
  keystone: {
    id:             'keystone',
    name:           'Keystone Jetty',
    region:         'North Sound',
    currStationId:  'PCT1516',
    currStationName:'Admiralty Inlet',
    tideStationId:  '9447110',
    tideStationName:'Port Townsend',
    // Variable — Admiralty Inlet is complex, slack timing less predictable
    meanDelta:      -5,
    stdDev:         12,
  },
  edmonds: {
    id:             'edmonds',
    name:           'Edmonds Underwater Park',
    region:         'North Sound',
    currStationId:  'PUG1503',
    currStationName:'Agate Passage',
    tideStationId:  '9447214',
    tideStationName:'Shilshole Bay',
    // Gentle and consistent — beginner site, close to station
    meanDelta:      3,
    stdDev:         4,
  },
}

// ── Entry builder ──────────────────────────────────────────────────────────────

interface LogEntry {
  siteId:               string
  siteName:             string
  region:               string
  diveDate:             Date
  entryTime:            string
  exitTime:             string
  maxDepthFt:           number
  plannedSlack:         string
  observedSlack:        string
  deltaMinutes:         number
  currStationId:        string
  currStationName:      string
  tideStationId:        string
  tideStationName:      string
  visibilityFt:         number
  waterTempF:           number
  currentStrength:      number
  currentStrengthLabel: string
  conditions:           string
  rating:               number
  notes:                string | null
  sharedWithCommunity:  boolean
}

const CURR_STRENGTH = ['None', 'Mild', 'Moderate', 'Strong', 'Dangerous']
const CONDITIONS     = ['better', 'as-predicted', 'as-predicted', 'worse'] // weighted

function buildEntry(
  site: typeof SITES[keyof typeof SITES],
  diveDate: Date,
  deltaOverride?: number,
  notes?: string,
  shared = false,
): LogEntry {
  const delta       = deltaOverride ?? randNormal(site.meanDelta, site.stdDev, -90, 90)
  const baseHour    = randInt(7, 15)
  const baseMin     = randInt(0, 59)
  const plannedSlack = timeFromBase(baseHour, baseMin, 0)
  const observedSlack = timeFromBase(baseHour, baseMin, delta)
  const entryTime   = timeFromBase(baseHour, baseMin, -45)
  const exitTime    = timeFromBase(baseHour, baseMin, 30)

  const absDelta    = Math.abs(delta)
  const currStrength = absDelta < 5 ? 0 : absDelta < 15 ? 1 : absDelta < 30 ? 2 : 3
  const conditions  = absDelta < 5
    ? 'as-predicted'
    : absDelta > 20 ? randChoice(['worse', 'as-predicted']) : randChoice(CONDITIONS)
  const rating      = absDelta < 5 ? randInt(4, 5) : absDelta < 15 ? randInt(3, 5) : randInt(2, 4)

  return {
    siteId:               site.id,
    siteName:             site.name,
    region:               site.region,
    diveDate,
    entryTime,
    exitTime,
    maxDepthFt:           randInt(30, site.id === 'keystone' ? 55 : 75),
    plannedSlack,
    observedSlack,
    deltaMinutes:         delta,
    currStationId:        site.currStationId,
    currStationName:      site.currStationName,
    tideStationId:        site.tideStationId,
    tideStationName:      site.tideStationName,
    visibilityFt:         randInt(8, 35),
    waterTempF:           randInt(44, 52),
    currentStrength:      currStrength,
    currentStrengthLabel: CURR_STRENGTH[currStrength],
    conditions,
    rating,
    notes:                notes ?? null,
    sharedWithCommunity:  shared,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const emailArg = process.argv[2]

  const user = emailArg
    ? await prisma.user.findUnique({ where: { email: emailArg } })
    : await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!user) {
    console.error('No user found. Pass an email as argument: npx tsx prisma/seed-test-data.ts you@example.com')
    process.exit(1)
  }

  console.log(`Seeding test data for: ${user.email}`)

  const entries: LogEntry[] = []

  // ── Three Tree Point — 14 entries, mean +10 min late ──────────────────────
  // 12 normal entries
  for (let i = 0; i < 12; i++) {
    entries.push(buildEntry(SITES.threetree, daysAgo(i * 12 + randInt(1, 10)), undefined, undefined, i % 3 === 0))
  }
  // 1 outlier — extreme late (data entry error, clearly wrong)
  entries.push(buildEntry(
    SITES.threetree, daysAgo(155),
    185,
    'Note: I think I recorded the wrong time here — was rushing to log before the boat left.',
    false,
  ))
  // 1 outlier — moderately early, plausible but unusual
  entries.push(buildEntry(
    SITES.threetree, daysAgo(168),
    -32,
    'Conditions very different from prediction today — strong NW wind may have affected current timing.',
    true,
  ))

  // ── Keystone Jetty — 13 entries, mean -5 min, high variance ───────────────
  for (let i = 0; i < 11; i++) {
    entries.push(buildEntry(SITES.keystone, daysAgo(i * 14 + randInt(1, 12)), undefined, undefined, i % 4 === 0))
  }
  // 1 large outlier — extreme early, plausible for Admiralty Inlet
  entries.push(buildEntry(
    SITES.keystone, daysAgo(160),
    -45,
    'Slack came much earlier than predicted. Talked to the ferry crew — they mentioned unusual outflow.',
    true,
  ))
  // 1 outlier — data entry error (opposite sign, looks like a typo)
  entries.push(buildEntry(
    SITES.keystone, daysAgo(175),
    -120,
    'Something went wrong with my dive computer sync — this delta looks wrong.',
    false,
  ))

  // ── Edmonds — 12 entries, gentle and consistent ────────────────────────────
  for (let i = 0; i < 11; i++) {
    entries.push(buildEntry(SITES.edmonds, daysAgo(i * 10 + randInt(1, 8)), undefined, undefined, i % 2 === 0))
  }
  // 1 mild outlier — still plausible
  entries.push(buildEntry(
    SITES.edmonds, daysAgo(115),
    18,
    'Slack was later than usual today. Big tidal exchange the day before may have contributed.',
    true,
  ))

  // ── Insert all entries ─────────────────────────────────────────────────────
  let created = 0
  for (const entry of entries) {
    await prisma.diveLog.create({
      data: { userId: user.id, ...entry },
    })
    created++
    process.stdout.write(`\r  Created ${created}/${entries.length} entries...`)
  }
  console.log(`\n  ✓ ${created} dive log entries created`)

  // ── Recompute corrections for all three sites ──────────────────────────────
  console.log('\nRecomputing corrections...')
  const { recomputeCorrection } = await import('../src/lib/corrections')

  for (const site of Object.values(SITES)) {
    await recomputeCorrection(site.id, user.id, site.currStationId, site.tideStationId)
    const corr = await prisma.siteCorrection.findUnique({
      where: { siteId_userId: { siteId: site.id, userId: user.id } },
    })
    if (corr) {
      console.log(`  ${site.name}:`)
      console.log(`    n=${corr.sampleSize}  mean=${corr.meanDelta.toFixed(1)}m  stdDev=${corr.stdDev.toFixed(1)}m  active=${corr.active}  confidence=${corr.confidence.toFixed(2)}`)
    }
  }

  // ── Recompute community corrections for shared entries ─────────────────────
  // Enable sharing for this user temporarily so community corrections compute
  await prisma.user.update({
    where: { id: user.id },
    data:  { shareLogsWithCommunity: true },
  })
  for (const site of Object.values(SITES)) {
    await recomputeCorrection(site.id, null, site.currStationId, site.tideStationId)
  }
  console.log('  ✓ Community corrections recomputed')
  console.log('\nDone! Check /dashboard/analysis to see corrections.')
  console.log('Note: shareLogsWithCommunity was enabled for this user to seed community data.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
