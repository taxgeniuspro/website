import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/settings
 * Fetch all settings or filter by category
 */
export async function GET(request: Request) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category, isActive: true } : { isActive: true }

    const settings = await prisma.settings.findMany({
      where,
      orderBy: { key: 'asc' },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[GET /api/settings] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

/**
 * POST /api/settings
 * Create or update a setting
 */
export async function POST(request: Request) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, category, description, isEncrypted } = body

    if (!key || !category) {
      return NextResponse.json({ error: 'Missing required fields: key, category' }, { status: 400 })
    }

    // Upsert setting
    const setting = await prisma.settings.upsert({
      where: { key },
      update: {
        value,
        category,
        description,
        isEncrypted: isEncrypted || false,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        category,
        description,
        isEncrypted: isEncrypted || false,
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('[POST /api/settings] Error:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}

/**
 * PATCH /api/settings
 * Batch update multiple settings
 */
export async function PATCH(request: Request) {
  try {
    const { user, session } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 })
    }

    // Batch upsert all settings
    const promises = settings.map((setting: any) =>
      prisma.settings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: new Date(),
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category || 'integrations',
          description: setting.description,
          isEncrypted: setting.isEncrypted || false,
        },
      })
    )

    const results = await Promise.all(promises)

    return NextResponse.json({ success: true, updated: results.length })
  } catch (error) {
    console.error('[PATCH /api/settings] Error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
