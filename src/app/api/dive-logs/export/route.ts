import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse('Not authenticated', { status: 401 })
  }

  const logs = await prisma.diveLog.findMany({
    where:   { userId: session.user.id },
    orderBy: { diveDate: 'desc' },
  })

  const cols = [
    'diveDate', 'siteName', 'region',
    'entryTime', 'exitTime', 'maxDepthFt',
    'plannedSlack', 'observedSlack', 'deltaMinutes',
    'currStationName', 'tideStationName',
    'visibilityFt', 'waterTempF',
    'currentStrengthLabel', 'conditions',
    'rating', 'notes',
  ] as const

  const header = cols.join(',')
  const rows = logs.map(log =>
    cols.map(col => {
      const val = log[col as keyof typeof log]
      if (val === null || val === undefined) return ''
      const str = val instanceof Date
        ? val.toISOString().split('T')[0]
        : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="tidetracker-dive-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
