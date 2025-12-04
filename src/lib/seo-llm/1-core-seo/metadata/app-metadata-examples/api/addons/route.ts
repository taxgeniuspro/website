import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

// GET /api/addons - List all addons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const addons = await prisma.addOn.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOn: true,
          },
        },
      },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('[GET /api/addons] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch addons' }, { status: 500 })
  }
}

// POST /api/addons - Create new addon
export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const {
      name,
      description,
      tooltipText,
      pricingModel,
      configuration,
      additionalTurnaroundDays,
      sortOrder,
      isActive,
      adminNotes,
    } = data

    // Validate required fields
    if (!name || !pricingModel || !configuration) {
      return NextResponse.json(
        { error: 'Missing required fields: name, pricingModel, configuration' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.addOn.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json({ error: 'An addon with this name already exists' }, { status: 400 })
    }

    const addon = await prisma.addOn.create({
      data: {
        id: randomUUID(),
        name,
        description,
        tooltipText,
        pricingModel,
        configuration,
        additionalTurnaroundDays: additionalTurnaroundDays || 0,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
        adminNotes,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(addon, { status: 201 })
  } catch (error) {
    console.error('[POST /api/addons] Error:', error)

    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An addon with this name already exists' }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: 'Failed to create addon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
