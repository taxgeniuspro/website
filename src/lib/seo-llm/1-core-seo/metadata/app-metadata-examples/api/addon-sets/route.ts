import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// GET /api/addon-sets - List all addon sets
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const include = searchParams.get('include') === 'items'

    const addOnSets = await prisma.addOnSet.findMany({
      where: {
        isActive: true,
      },
      include: {
        AddOnSetItem: include
          ? {
              include: {
                AddOn: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            }
          : false,
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOnSet: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Transform PascalCase Prisma fields to camelCase for frontend
    const transformedSets = addOnSets.map((set) => ({
      ...set,
      addOnSetItems: set.AddOnSetItem
        ? set.AddOnSetItem.map((item: any) => ({
            ...item,
            addOn: item.AddOn,
            AddOn: undefined, // Remove PascalCase field
          }))
        : [],
      _count: {
        addOnSetItems: set._count.AddOnSetItem,
        productAddOnSets: set._count.ProductAddOnSet,
      },
      AddOnSetItem: undefined, // Remove PascalCase field
    }))

    return NextResponse.json(transformedSets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch addon sets' }, { status: 500 })
  }
}

// POST /api/addon-sets - Create a new addon set
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, addOnIds = [] } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create the addon set
    const addOnSet = await prisma.addOnSet.create({
      data: {
        id: randomUUID(),
        name,
        description,
        sortOrder: 0, // Will be updated if needed
        isActive: true,
        updatedAt: new Date(),
      },
    })

    // If addOnIds provided, create the addon set items
    if (addOnIds.length > 0) {
      await prisma.addOnSetItem.createMany({
        data: addOnIds.map((addOnId: string, index: number) => ({
          id: randomUUID(),
          addOnSetId: addOnSet.id,
          addOnId,
          displayPosition: 'IN_DROPDOWN' as const,
          sortOrder: index,
          isDefault: false,
          updatedAt: new Date(),
        })),
      })
    }

    // Fetch the complete addon set with items
    const completeAddOnSet = await prisma.addOnSet.findUnique({
      where: { id: addOnSet.id },
      include: {
        AddOnSetItem: {
          include: {
            AddOn: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOnSet: true,
          },
        },
      },
    })

    // Transform PascalCase to camelCase
    const transformed = completeAddOnSet
      ? {
          ...completeAddOnSet,
          addOnSetItems: completeAddOnSet.AddOnSetItem.map((item: any) => ({
            ...item,
            addOn: item.AddOn,
            AddOn: undefined,
          })),
          _count: {
            addOnSetItems: completeAddOnSet._count.AddOnSetItem,
            productAddOnSets: completeAddOnSet._count.ProductAddOnSet,
          },
          AddOnSetItem: undefined,
        }
      : null

    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create addon set' }, { status: 500 })
  }
}
