import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) {
    return new NextResponse('Not authenticated', { status: 401 })
  }

  const logs = await prisma.diveLog.findMany({
    where:   { userId: token.id as string },
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