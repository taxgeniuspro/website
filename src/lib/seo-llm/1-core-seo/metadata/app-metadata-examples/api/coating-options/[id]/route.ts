import { validateRequest } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isPrismaError, getErrorCode } from '@/lib/error-utils'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const coatingOption = await prisma.coatingOption.update({
      where: { id },
      data: {
        name,
        description,
      },
    })

    return NextResponse.json(coatingOption)
  } catch (error) {
    const errorCode = getErrorCode(error)

    if (errorCode === 'P2002') {
      return NextResponse.json(
        { error: 'A coating option with this name already exists' },
        { status: 400 }
      )
    }

    if (errorCode === 'P2025') {
      return NextResponse.json({ error: 'Coating option not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update coating option' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if coating option is in use
    const coatingWithRelations = await prisma.coatingOption.findUnique({
      where: { id },
      include: {
        _count: {
          select: { PaperStockCoating: true },
        },
      },
    })

    if (!coatingWithRelations) {
      return NextResponse.json({ error: 'Coating option not found' }, { status: 404 })
    }

    if (coatingWithRelations._count.PaperStockCoating > 0) {
      return NextResponse.json(
        { error: 'Cannot delete coating option that is in use by paper stocks' },
        { status: 400 }
      )
    }

    await prisma.coatingOption.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorCode = getErrorCode(error)

    if (errorCode === 'P2025') {
      return NextResponse.json({ error: 'Coating option not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete coating option' }, { status: 500 })
  }
}
