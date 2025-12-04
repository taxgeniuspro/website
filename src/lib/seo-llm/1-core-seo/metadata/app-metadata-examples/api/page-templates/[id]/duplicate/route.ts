import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// POST /api/page-templates/[id]/duplicate - Clone template with all elements
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const original = await prisma.pageTemplate.findUnique({
    where: { id: params.id },
    include: {
      PageElement: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!original) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Check access (owner or public template)
  if (original.userId !== user.id && !original.isPublic) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const timestamp = Date.now()
  const newTemplateId = 'template-' + timestamp

  // Create new template
  const duplicated = await prisma.pageTemplate.create({
    data: {
      id: newTemplateId,
      userId: user.id,
      name: original.name + ' (Copy)',
      description: original.description,
      category: original.category,
      isPublic: false, // Copies are always private
      sortOrder: 0,
    },
  })

  // Clone all elements
  const elementIdMap = new Map<string, string>()

  // First pass: Create all elements without parent references
  const rootElements = original.PageElement.filter((el) => !el.parentId)
  for (const element of rootElements) {
    const newElementId = 'element-' + timestamp + '-' + Math.random().toString(36).substr(2, 9)
    elementIdMap.set(element.id, newElementId)

    await prisma.pageElement.create({
      data: {
        id: newElementId,
        pageTemplateId: newTemplateId,
        type: element.type,
        content: element.content as any,
        styles: element.styles as any,
        position: element.position as any,
        sortOrder: element.sortOrder,
        isVisible: element.isVisible,
      },
    })
  }

  // Second pass: Create child elements with proper parent references
  const childElements = original.PageElement.filter((el) => el.parentId)
  for (const element of childElements) {
    const newElementId = 'element-' + timestamp + '-' + Math.random().toString(36).substr(2, 9)
    elementIdMap.set(element.id, newElementId)

    const newParentId = element.parentId ? elementIdMap.get(element.parentId) : null

    await prisma.pageElement.create({
      data: {
        id: newElementId,
        pageTemplateId: newTemplateId,
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

  return NextResponse.json(duplicated, { status: 201 })
}
