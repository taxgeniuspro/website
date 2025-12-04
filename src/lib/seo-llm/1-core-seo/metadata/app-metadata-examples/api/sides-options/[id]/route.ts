import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth, handleAuthError } from '@/lib/auth/api-helpers'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user } = await requireAdminAuth()

    const body = await request.json()
    const { name, code, description, isDefault } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const sidesOption = await prisma.sidesOption.update({
      where: { id },
      data: {
        name,
        code,
        description,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(sidesOption)
  } catch (error: any) {
    // Handle auth errors first
    if (
      (error as any)?.name === 'AuthenticationError' ||
      (error as any)?.name === 'AuthorizationError'
    ) {
      return handleAuthError(error)
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A sides option with this name or code already exists' },
        { status: 400 }
      )
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Sides option not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update sides option' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await requireAdminAuth()

    // Check if sides option is in use
    const sidesWithRelations = await prisma.sidesOption.findUnique({
      where: { id },
      include: {
        _count: {
          select: { paperStockSides: true },
        },
      },
    })

    if (!sidesWithRelations) {
      return NextResponse.json({ error: 'Sides option not found' }, { status: 404 })
    }

    if (sidesWithRelations._count.paperStockSides > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sides option that is in use by paper stocks' },
        { status: 400 }
      )
    }

    await prisma.sidesOption.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Handle auth errors first
    if (
      (error as any)?.name === 'AuthenticationError' ||
      (error as any)?.name === 'AuthorizationError'
    ) {
      return handleAuthError(error)
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Sides option not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete sides option' }, { status: 500 })
  }
}
