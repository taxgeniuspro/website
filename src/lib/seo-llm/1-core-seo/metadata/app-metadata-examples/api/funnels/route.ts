import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const createFunnelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
})

// POST /api/funnels - Create new funnel
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createFunnelSchema.parse(body)

    // Generate slug from name
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now()

    const funnel = await prisma.funnel.create({
      data: {
        id: 'funnel-' + Date.now(),
        userId: user.id,
        name: data.name,
        slug,
        description: data.description,
        status: 'DRAFT',
        currency: 'USD',
        timezone: 'America/Chicago',
      },
    })

    return NextResponse.json(funnel, { status: 201 })
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

// GET /api/funnels - List user's funnels
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const funnels = await prisma.funnel.findMany({
      where: { userId: user.id },
      include: {
        FunnelStep: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            FunnelStep: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(funnels)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
