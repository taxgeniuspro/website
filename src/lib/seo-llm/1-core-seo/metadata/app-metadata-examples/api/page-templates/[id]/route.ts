import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().optional(),
  thumbnail: z.string().optional().nullable(),
})

// GET /api/page-templates/[id] - Get single template
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const template = await prisma.pageTemplate.findUnique({
    where: { id: params.id },
    include: {
      PageElement: {
        orderBy: { sortOrder: 'asc' },
        include: {
          Children: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Check ownership or public access
  if (template.userId !== user.id && !template.isPublic) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(template)
}

// PATCH /api/page-templates/[id] - Update template
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
  const data = updateTemplateSchema.parse(body)

  const updated = await prisma.pageTemplate.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}

// DELETE /api/page-templates/[id] - Delete template
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

  await prisma.pageTemplate.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
