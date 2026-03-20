import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sites = await prisma.diveSite.findMany({
    orderBy: [
      { region: 'asc' },
      { name:   'asc' },
    ],
  })
  return NextResponse.json({ sites })
}
