import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// GET /api/addons/[id] - Get single addon
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const addon = await prisma.addOn.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOn: true,
          },
        },
      },
    })

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    return NextResponse.json(addon)
  } catch (error) {
    console.error('[GET /api/addons/[id]] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch addon' }, { status: 500 })
  }
}

// PUT /api/addons/[id] - Update addon
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Check if addon exists
    const existing = await prisma.addOn.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    // If name is being changed, check for duplicates
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.addOn.findUnique({
        where: { name: data.name },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'An addon with this name already exists' },
          { status: 400 }
        )
      }
    }

    const addon = await prisma.addOn.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        tooltipText: data.tooltipText,
        pricingModel: data.pricingModel,
        configuration: data.configuration,
        additionalTurnaroundDays: data.additionalTurnaroundDays,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        adminNotes: data.adminNotes,
      },
    })

    return NextResponse.json(addon)
  } catch (error) {
    console.error('[PUT /api/addons/[id]] Error:', error)

    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An addon with this name already exists' }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: 'Failed to update addon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/addons/[id] - Delete addon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if addon exists
    const addon = await prisma.addOn.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            AddOnSetItem: true,
            ProductAddOn: true,
          },
        },
      },
    })

    if (!addon) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    // Check if addon is in use
    if (addon._count.AddOnSetItem > 0 || addon._count.ProductAddOn > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete addon that is in use',
          details: `This addon is used in ${addon._count.AddOnSetItem} addon sets and ${addon._count.ProductAddOn} products`,
        },
        { status: 400 }
      )
    }

    await prisma.addOn.delete({ where: { id } })

    return NextResponse.json({ message: 'Addon deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/addons/[id]] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete addon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PATCH /api/addons/[id] - Partial update (for toggles)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const addon = await prisma.addOn.update({
      where: { id },
      data,
    })

    return NextResponse.json(addon)
  } catch (error) {
    console.error('[PATCH /api/addons/[id]] Error:', error)
    return NextResponse.json({ error: 'Failed to update addon' }, { status: 500 })
  }
}
