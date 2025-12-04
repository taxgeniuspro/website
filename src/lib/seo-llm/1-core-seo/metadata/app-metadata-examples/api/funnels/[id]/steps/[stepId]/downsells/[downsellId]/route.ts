import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { downsellId: string } }) {
  const { user } = await validateRequest()
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.downsell.delete({ where: { id: params.downsellId } })
  return NextResponse.json({ success: true })
}
