import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const search = searchParams.get('search')

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {
      isActive: true,
    }

    if (state) {
      whereClause.state = state.toUpperCase()
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get airports with full data for locations page display
    const airports = await prisma.airport.findMany({
      where: whereClause,
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        state: true,
        address: true,
        zip: true,
        hours: true,
        operator: true,
        carrier: true,
      },
      orderBy: [{ city: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      airports,
      count: airports.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch airports',
      },
      { status: 500 }
    )
  }
}
