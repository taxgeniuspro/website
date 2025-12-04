import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json({ error: 'SKU parameter is required' }, { status: 400 })
    }

    // Check if SKU exists in the database
    const existingProduct = await prisma.product.findFirst({
      where: {
        sku: {
          equals: sku,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
      },
    })

    return NextResponse.json({
      exists: !!existingProduct,
      product: existingProduct || null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check SKU' }, { status: 500 })
  }
}
