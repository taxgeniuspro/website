import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const bump = await prisma.orderBump.create({
    data: {
      id: 'bump-' + Date.now(),
      funnelStepId: params.stepId,
      productId: body.productId,
      headline: body.headline,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      position: body.position || 'ABOVE_PAYMENT',
      isActive: true,
    },
  })
  return NextResponse.json(bump, { status: 201 })
}
