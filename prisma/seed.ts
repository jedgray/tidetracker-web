import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Dive sites are static reference data — stored here so future
// server-side features (site search, nearby station lookup) can query them.
const SITES = [
  { id: 'edmonds',   name: 'Edmonds Underwater Park', region: 'North Sound',   lat: 47.8118, lon: -122.3854, type: 'Artificial reef / park',      depthFt: 60,  skill: 'beginner',    currentWarn: false, currStationId: 'PUG1503', tideStationId: '9447214' },
  { id: 'mukilteo',  name: 'Mukilteo T-Dock',         region: 'North Sound',   lat: 47.9497, lon: -122.3022, type: 'Dock / pilings',               depthFt: 120, skill: 'beginner',    currentWarn: false, currStationId: 'PUG1503', tideStationId: '9447359' },
  { id: 'keystone',  name: 'Keystone Jetty',          region: 'North Sound',   lat: 48.1578, lon: -122.6828, type: 'Jetty / current drift',         depthFt: 60,  skill: 'advanced',    currentWarn: true,  currStationId: 'PUG1620', tideStationId: '9447110' },
  { id: 'alki2',     name: 'Alki Cove 2',             region: 'Central Sound', lat: 47.5762, lon: -122.4197, type: 'Shore / reef',                  depthFt: 60,  skill: 'beginner',    currentWarn: false, currStationId: 'PUG1501', tideStationId: '9447130' },
  { id: 'alkijunk',  name: 'Alki Junkyard',           region: 'Central Sound', lat: 47.5721, lon: -122.4223, type: 'Artificial reef',               depthFt: 60,  skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1501', tideStationId: '9447130' },
  { id: 'threetree', name: 'Three Tree Point',        region: 'Central Sound', lat: 47.4451, lon: -122.3787, type: 'Wall / reef',                   depthFt: 80,  skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1501', tideStationId: '9447130' },
  { id: 'redondo',   name: 'Redondo Fishing Pier',    region: 'Central Sound', lat: 47.3703, lon: -122.3142, type: 'Pier / pilings',                depthFt: 45,  skill: 'beginner',    currentWarn: false, currStationId: 'PUG1501', tideStationId: '9446807' },
  { id: 'saltwater', name: 'Saltwater State Park',    region: 'Central Sound', lat: 47.3748, lon: -122.3067, type: 'Shore / reef',                  depthFt: 50,  skill: 'beginner',    currentWarn: false, currStationId: 'PUG1501', tideStationId: '9446807' },
  { id: 'sunnyside', name: 'Sunnyside Beach',         region: 'South Sound',   lat: 47.3318, lon: -122.5742, type: 'Shore / sandy',                 depthFt: 50,  skill: 'beginner',    currentWarn: false, currStationId: 'PUG1511', tideStationId: '9446807' },
  { id: 'sunrise',   name: 'Sunrise Beach',           region: 'South Sound',   lat: 47.3490, lon: -122.5560, type: 'Wall / reef',                   depthFt: 90,  skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1511', tideStationId: '9446807' },
  { id: 'dayisland', name: 'Day Island Wall',         region: 'South Sound',   lat: 47.2420, lon: -122.5629, type: 'Wall',                          depthFt: 110, skill: 'advanced',    currentWarn: true,  currStationId: 'PUG1515', tideStationId: '9446807' },
  { id: 'foxisland', name: 'Fox Island Wall',         region: 'South Sound',   lat: 47.2392, lon: -122.6325, type: 'Wall',                          depthFt: 100, skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1511', tideStationId: '9446807' },
  { id: 'saltcreek', name: 'Salt Creek',              region: 'Strait',        lat: 48.1603, lon: -123.6972, type: 'Reef / wall',                   depthFt: 80,  skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1641', tideStationId: '9443090' },
  { id: 'sekiu',     name: 'Sekiu',                   region: 'Strait',        lat: 48.2695, lon: -124.2961, type: 'Shore / reef',                  depthFt: 70,  skill: 'intermediate',currentWarn: true,  currStationId: 'PUG1642', tideStationId: '9443090' },
]

async function main() {
  console.log('Seeding dive sites...')
  for (const site of SITES) {
    await prisma.diveSite.upsert({
      where: { id: site.id },
      update: site,
      create: site,
    })
  }
  console.log(`Seeded ${SITES.length} dive sites.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
