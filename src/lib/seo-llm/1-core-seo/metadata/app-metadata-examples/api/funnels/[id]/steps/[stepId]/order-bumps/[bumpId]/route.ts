import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { bumpId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.orderBump.delete({ where: { id: params.bumpId } })
  return NextResponse.json({ success: true })
}
