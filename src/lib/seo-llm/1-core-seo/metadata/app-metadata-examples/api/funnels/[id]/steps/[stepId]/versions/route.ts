import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const createVersionSchema = z.object({
  versionName: z.string().min(1),
  templateId: z.string().optional().nullable(),
  trafficSplit: z.number().min(0).max(100).default(100),
})

// GET /api/funnels/[id]/steps/[stepId]/versions - List versions for step
export async function GET(request: NextRequest, { params }: { params: { stepId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const versions = await prisma.pageVersion.findMany({
    where: { funnelStepId: params.stepId },
    include: {
      PageElement: {
        orderBy: { sortOrder: 'asc' },
      },
      PageTemplate: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(versions)
}

// POST /api/funnels/[id]/steps/[stepId]/versions - Create page version
export async function POST(request: NextRequest, { params }: { params: { stepId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data = createVersionSchema.parse(body)

  // Check if version name already exists for this step
  const existing = await prisma.pageVersion.findUnique({
    where: {
      funnelStepId_versionName: {
        funnelStepId: params.stepId,
        versionName: data.versionName,
      },
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Version name already exists for this step' },
      { status: 400 }
    )
  }

  const version = await prisma.pageVersion.create({
    data: {
      id: 'version-' + Date.now(),
      funnelStepId: params.stepId,
      versionName: data.versionName,
      templateId: data.templateId,
      trafficSplit: data.trafficSplit,
    },
  })

  // If this is the first version, make it active
  const versionCount = await prisma.pageVersion.count({
    where: { funnelStepId: params.stepId },
  })

  if (versionCount === 1) {
    await prisma.pageVersion.update({
      where: { id: version.id },
      data: { isActive: true },
    })
  }

  // If based on template, clone all elements
  if (data.templateId) {
    const template = await prisma.pageTemplate.findUnique({
      where: { id: data.templateId },
      include: {
        PageElement: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (template) {
      const timestamp = Date.now()
      const elementIdMap = new Map<string, string>()

      // Clone root elements first
      const rootElements = template.PageElement.filter((el) => !el.parentId)
      for (const element of rootElements) {
        const newElementId = 'element-' + timestamp + '-' + Math.random().toString(36).substr(2, 9)
        elementIdMap.set(element.id, newElementId)

        await prisma.pageElement.create({
          data: {
            id: newElementId,
            pageVersionId: version.id,
            type: element.type,
            content: element.content as any,
            styles: element.styles as any,
            position: element.position as any,
            sortOrder: element.sortOrder,
            isVisible: element.isVisible,
          },
        })
      }

      // Clone child elements with parent references
      const childElements = template.PageElement.filter((el) => el.parentId)
      for (const element of childElements) {
        const newElementId = 'element-' + timestamp + '-' + Math.random().toString(36).substr(2, 9)
        const newParentId = element.parentId ? elementIdMap.get(element.parentId) : null

        await prisma.pageElement.create({
          data: {
            id: newElementId,
            pageVersionId: version.id,
            type: element.type,
            content: element.content as any,
            styles: element.styles as any,
            position: element.position as any,
            parentId: newParentId,
            sortOrder: element.sortOrder,
            isVisible: element.isVisible,
          },
        })
      }
    }
  }

  return NextResponse.json(version, { status: 201 })
}
