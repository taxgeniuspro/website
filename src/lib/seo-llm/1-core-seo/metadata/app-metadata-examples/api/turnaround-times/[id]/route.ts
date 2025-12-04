import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTurnaroundTimeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  daysMin: z.number().min(0).max(30).optional(),
  daysMax: z.number().min(0).max(30).optional(),
  pricingModel: z.enum(['FLAT', 'PERCENTAGE', 'PER_UNIT', 'CUSTOM']).optional(),
  basePrice: z.number().min(0).optional(),
  priceMultiplier: z.number().min(0.1).max(10).optional(),
  requiresNoCoating: z.boolean().optional(),
  restrictedCoatings: z.array(z.string()).optional(),
  restrictedOptions: z.any().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/turnaround-times/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const turnaroundTime = await prisma.turnaroundTime.findUnique({
      where: { id },
      include: {
        turnaroundTimeSetItems: {
          include: {
            TurnaroundTimeSet: true,
          },
        },
      },
    })

    if (!turnaroundTime) {
      return NextResponse.json({ error: 'Turnaround time not found' }, { status: 404 })
    }

    return NextResponse.json(turnaroundTime)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch turnaround time' }, { status: 500 })
  }
}

// PUT /api/turnaround-times/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateTurnaroundTimeSchema.parse(body)

    const turnaroundTime = await prisma.turnaroundTime.update({
      where: { id },
      data,
    })

    return NextResponse.json(turnaroundTime)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update turnaround time' }, { status: 500 })
  }
}

// DELETE /api/turnaround-times/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.turnaroundTime.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Turnaround time deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete turnaround time' }, { status: 500 })
  }
}
