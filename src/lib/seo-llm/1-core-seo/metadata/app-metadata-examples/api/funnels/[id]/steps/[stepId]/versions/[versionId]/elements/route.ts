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

// POST /api/funnels/[id]/steps/[stepId]/versions/[versionId]/elements - Add element to version
export async function POST(request: NextRequest, { params }: { params: { versionId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const version = await prisma.pageVersion.findUnique({
    where: { id: params.versionId },
  })

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const body = await request.json()
  const data = createElementSchema.parse(body)

  const element = await prisma.pageElement.create({
    data: {
      id: 'element-' + Date.now(),
      pageVersionId: params.versionId,
      type: data.type,
      content: data.content as any,
      styles: data.styles as any,
      position: data.position as any,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
    },
  })

  return NextResponse.json(element, { status: 201 })
}
