import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { stepId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const upsell = await prisma.upsell.create({
    data: {
      id: 'upsell-' + Date.now(),
      funnelStepId: params.stepId,
      productId: body.productId,
      headline: body.headline,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      isActive: true,
    },
  })
  return NextResponse.json(upsell, { status: 201 })
}
