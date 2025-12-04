import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const productSchema = z.object({
  productId: z.string(),
  quantity: z.number().optional(),
  priceOverride: z.number().optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable(),
  discountValue: z.number().optional().nullable(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// POST - Add product to step
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const funnel = await prisma.funnel.findUnique({
      where: { id: params.id },
      select: { userId: true },
    })

    if (!funnel || funnel.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = productSchema.parse(body)

    const fsp = await prisma.funnelStepProduct.create({
      data: {
        id: 'fsp-' + Date.now(),
        funnelStepId: params.stepId,
        productId: data.productId,
        quantity: data.quantity || 1,
        priceOverride: data.priceOverride,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isDefault: data.isDefault || false,
        sortOrder: data.sortOrder || 0,
      },
    })

    return NextResponse.json(fsp, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
