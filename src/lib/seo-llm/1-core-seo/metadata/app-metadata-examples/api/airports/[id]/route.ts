import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Get full airport details by ID
    const airport = await prisma.airport.findUnique({
      where: {
        id: id,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        carrier: true,
        operator: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        hours: true,
      },
    })

    if (!airport) {
      return NextResponse.json(
        {
          success: false,
          error: 'Airport not found',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      airport,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch airport details',
      },
      { status: 500 }
    )
  }
}
