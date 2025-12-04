import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean().default(false),
})

// GET /api/page-templates - List templates
export async function GET(request: NextRequest) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const includePublic = searchParams.get('includePublic') === 'true'

  const where: any = {}

  if (includePublic) {
    where.OR = [{ userId: user.id }, { isPublic: true }]
  } else {
    where.userId = user.id
  }

  if (category) {
    where.category = category
  }

  const templates = await prisma.pageTemplate.findMany({
    where,
    include: {
      _count: {
        select: { PageElement: true },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(templates)
}

// POST /api/page-templates - Create template
export async function POST(request: NextRequest) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data = createTemplateSchema.parse(body)

  const template = await prisma.pageTemplate.create({
    data: {
      id: 'template-' + Date.now(),
      userId: user.id,
      name: data.name,
      description: data.description,
      category: data.category,
      isPublic: data.isPublic,
    },
  })

  return NextResponse.json(template, { status: 201 })
}
