import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const updateElementSchema = z.object({
  type: z
    .enum([
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
    ])
    .optional(),
  content: z.record(z.any()).optional(),
  styles: z.record(z.any()).optional(),
  position: z.record(z.any()).optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isVisible: z.boolean().optional(),
})

// PATCH /api/page-templates/[id]/elements/[elementId] - Update element
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; elementId: string } }
) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const element = await prisma.pageElement.findUnique({
    where: { id: params.elementId },
    include: { PageTemplate: true },
  })

  if (!element) {
    return NextResponse.json({ error: 'Element not found' }, { status: 404 })
  }

  if (element.PageTemplate?.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const data = updateElementSchema.parse(body)

  const updated = await prisma.pageElement.update({
    where: { id: params.elementId },
    data,
  })

  return NextResponse.json(updated)
}

// DELETE /api/page-templates/[id]/elements/[elementId] - Delete element
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; elementId: string } }
) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const element = await prisma.pageElement.findUnique({
    where: { id: params.elementId },
    include: { PageTemplate: true },
  })

  if (!element) {
    return NextResponse.json({ error: 'Element not found' }, { status: 404 })
  }

  if (element.PageTemplate?.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.pageElement.delete({
    where: { id: params.elementId },
  })

  return NextResponse.json({ success: true })
}
