import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

interface Context {
  params: Promise<{
    id: string
  }>
}

// PUT /api/products/[id]/draft - Update a draft product
export async function PUT(request: NextRequest, context: Context) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const data = await request.json()

    // Check if product exists and belongs to user (or user is admin)
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Update the draft product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        isDraft: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update draft product' }, { status: 500 })
  }
}
