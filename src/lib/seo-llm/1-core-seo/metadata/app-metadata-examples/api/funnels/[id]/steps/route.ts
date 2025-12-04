import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const createStepSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  type: z.enum(['LANDING', 'CHECKOUT', 'UPSELL', 'DOWNSELL', 'THANKYOU']),
  position: z.number().int().positive(),
  config: z.any().optional(),
  design: z.any().optional(),
  isActive: z.boolean().optional(),
})

// POST /api/funnels/[id]/steps - Create new step
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify funnel ownership
    const funnel = await prisma.funnel.findUnique({
      where: { id: params.id },
      select: { userId: true },
    })

    if (!funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })
    }

    if (funnel.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = createStepSchema.parse(body)

    // Reorder existing steps if needed
    await prisma.funnelStep.updateMany({
      where: {
        funnelId: params.id,
        position: { gte: data.position },
      },
      data: {
        position: { increment: 1 },
      },
    })

    // Create step
    const step = await prisma.funnelStep.create({
      data: {
        id: 'step-' + Date.now(),
        funnelId: params.id,
        name: data.name,
        slug: data.slug,
        type: data.type,
        position: data.position,
        config: data.config || {},
        design: data.design || null,
        isActive: data.isActive ?? true,
      },
    })

    return NextResponse.json(step, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
