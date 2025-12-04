import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { transformQuantityGroups } from '@/lib/utils/quantity-transformer'
import { randomUUID } from 'crypto'

// GET /api/quantities - List all quantity groups
// Optional query params:
//   - active=true: Only return active groups
//   - format=selector: Return transformed data for quantity selector component
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'
    const format = searchParams.get('format')

    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }

    const quantityGroups = await prisma.quantityGroup.findMany({
      where,
      include: {
        _count: {
          select: {
            ProductQuantityGroup: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Process the groups to include parsed values list
    const processedGroups = quantityGroups.map((group) => ({
      ...group,
      valuesList: group.values
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v),
      hasCustomOption: group.values.toLowerCase().includes('custom'),
    }))

    // If format=selector, return transformed data for quantity selector component
    if (format === 'selector') {
      const transformedQuantities = transformQuantityGroups(processedGroups)
      return NextResponse.json(transformedQuantities)
    }

    // Default: return quantity groups for admin interface
    return NextResponse.json(processedGroups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quantity groups' }, { status: 500 })
  }
}

// POST /api/quantities - Create a new quantity group
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { name, description, values, defaultValue, customMin, customMax, sortOrder, isActive } =
      body

    // Validation
    if (!name || !values || !defaultValue) {
      return NextResponse.json(
        { error: 'Name, values, and default value are required' },
        { status: 400 }
      )
    }

    const quantityGroup = await prisma.quantityGroup.create({
      data: {
        id: randomUUID(),
        name,
        description,
        values,
        defaultValue,
        customMin,
        customMax,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(quantityGroup, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A quantity group with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create quantity group' }, { status: 500 })
  }
}
