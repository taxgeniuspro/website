import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { z } from 'zod'

const updateVersionSchema = z.object({
  versionName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  trafficSplit: z.number().min(0).max(100).optional(),
})

// PATCH /api/funnels/[id]/steps/[stepId]/versions/[versionId] - Update version
export async function PATCH(request: NextRequest, { params }: { params: { versionId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data = updateVersionSchema.parse(body)

  // If activating this version, deactivate all others for this step
  if (data.isActive === true) {
    const version = await prisma.pageVersion.findUnique({
      where: { id: params.versionId },
    })

    if (version) {
      await prisma.pageVersion.updateMany({
        where: {
          funnelStepId: version.funnelStepId,
          id: { not: params.versionId },
        },
        data: { isActive: false },
      })
    }
  }

  const updated = await prisma.pageVersion.update({
    where: { id: params.versionId },
    data,
  })

  return NextResponse.json(updated)
}

// DELETE /api/funnels/[id]/steps/[stepId]/versions/[versionId] - Delete version
export async function DELETE(request: NextRequest, { params }: { params: { versionId: string } }) {
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

  // Don't allow deleting if it's the only version
  const versionCount = await prisma.pageVersion.count({
    where: { funnelStepId: version.funnelStepId },
  })

  if (versionCount === 1) {
    return NextResponse.json({ error: 'Cannot delete the only version' }, { status: 400 })
  }

  // If deleting active version, make another version active
  if (version.isActive) {
    const otherVersion = await prisma.pageVersion.findFirst({
      where: {
        funnelStepId: version.funnelStepId,
        id: { not: params.versionId },
      },
    })

    if (otherVersion) {
      await prisma.pageVersion.update({
        where: { id: otherVersion.id },
        data: { isActive: true },
      })
    }
  }

  await prisma.pageVersion.delete({
    where: { id: params.versionId },
  })

  return NextResponse.json({ success: true })
}
