import { validateRequest } from '@/lib/auth'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from 'ioredis'

export async function GET(): Promise<unknown> {
  try {
    // Cache key for sides options
    const cacheKey = 'sides:options:list'

    // Try to get from cache first
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const sidesOptions = await prisma.sidesOption.findMany({
      orderBy: { name: 'asc' },
    })

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, sidesOptions, 3600)

    return NextResponse.json(sidesOptions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sides options' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!session || !user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const sidesOption = await prisma.sidesOption.create({
      data: {
        name,
        code: name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, ''),
      },
    })

    return NextResponse.json(sidesOption, { status: 201 })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A sides option with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create sides option' }, { status: 500 })
  }
}
