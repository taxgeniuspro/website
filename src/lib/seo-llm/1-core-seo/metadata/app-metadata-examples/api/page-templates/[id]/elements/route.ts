import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const createElementSchema = z.object({
  type: z.enum([
    'HEADING',
    'TEXT',
    'IMAGE',
    'BUTTON',
    'FORM',
    'VIDEO',
    'COUNTDOWN',
    'TESTIMONIAL',
    'FEATURE_LIST',
    'PRICING_TABLE',
    'SPACER',
    'DIVIDER',
    'HTML',
    'CONTAINER',
    'COLUMN',
  ]),
  content: z.record(z.any()),
  styles: z.record(z.any()),
  position: z.record(z.any()),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().default(0),
})

// POST /api/page-templates/[id]/elements - Add element to template
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const template = await prisma.pageTemplate.findUnique({
    where: { id: params.id },
  })

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  if (template.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const data = createElementSchema.parse(body)

  const element = await prisma.pageElement.create({
    data: {
      id: 'element-' + Date.now(),
      pageTemplateId: params.id,
      type: data.type,
      content: data.content,
      styles: data.styles,
      position: data.position,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    },
  })

  return NextResponse.json(element, { status: 201 })
}
