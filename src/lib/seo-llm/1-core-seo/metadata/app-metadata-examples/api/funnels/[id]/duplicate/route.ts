import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

// POST /api/funnels/[id]/duplicate - Duplicate funnel
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await validateRequest()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get original funnel with all steps
    const originalFunnel = await prisma.funnel.findUnique({
      where: { id: params.id },
      include: {
        FunnelStep: {
          orderBy: { position: 'asc' },
          include: {
            FunnelStepProduct: true,
            OrderBump: true,
            Upsell: true,
            Downsell: true,
          },
        },
      },
    })

    if (!originalFunnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })
    }

    // Verify ownership
    if (originalFunnel.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const timestamp = Date.now()

    // Create duplicate funnel
    const duplicatedFunnel = await prisma.funnel.create({
      data: {
        id: 'funnel-' + timestamp,
        userId: user.id,
        name: `${originalFunnel.name} (Copy)`,
        slug: `${originalFunnel.slug}-copy-${timestamp}`,
        description: originalFunnel.description,
        status: 'DRAFT',
        currency: originalFunnel.currency,
        timezone: originalFunnel.timezone,
        seoTitle: originalFunnel.seoTitle,
        seoDescription: originalFunnel.seoDescription,
        settings: originalFunnel.settings as any,

        // Duplicate steps
        FunnelStep: {
          create: originalFunnel.FunnelStep.map((step, index) => ({
            id: `step-${timestamp}-${index}`,
            name: step.name,
            slug: step.slug,
            type: step.type,
            position: step.position,
            config: step.config as any,
            design: step.design as any,
            seoTitle: step.seoTitle,
            seoDescription: step.seoDescription,
            isActive: step.isActive,

            // Duplicate step products
            FunnelStepProduct: {
              create: step.FunnelStepProduct.map((fsp, fspIndex) => ({
                id: `fsp-${timestamp}-${index}-${fspIndex}`,
                productId: fsp.productId,
                quantity: fsp.quantity,
                priceOverride: fsp.priceOverride,
                discountType: fsp.discountType,
                discountValue: fsp.discountValue,
                isDefault: fsp.isDefault,
                sortOrder: fsp.sortOrder,
              })),
            },

            // Duplicate order bumps
            OrderBump: {
              create: step.OrderBump.map((bump, bumpIndex) => ({
                id: `bump-${timestamp}-${index}-${bumpIndex}`,
                productId: bump.productId,
                headline: bump.headline,
                description: bump.description,
                discountType: bump.discountType,
                discountValue: bump.discountValue,
                position: bump.position,
                displayRules: bump.displayRules,
                design: bump.design,
                isActive: bump.isActive,
              })),
            },

            // Duplicate upsells
            Upsell: {
              create: step.Upsell.map((upsell, upsellIndex) => ({
                id: `upsell-${timestamp}-${index}-${upsellIndex}`,
                productId: upsell.productId,
                headline: upsell.headline,
                description: upsell.description,
                discountType: upsell.discountType,
                discountValue: upsell.discountValue,
                design: upsell.design,
                isActive: upsell.isActive,
              })),
            },

            // Duplicate downsells
            Downsell: {
              create: step.Downsell.map((downsell, downsellIndex) => ({
                id: `downsell-${timestamp}-${index}-${downsellIndex}`,
                productId: downsell.productId,
                headline: downsell.headline,
                description: downsell.description,
                discountType: downsell.discountType,
                discountValue: downsell.discountValue,
                design: downsell.design,
                isActive: downsell.isActive,
              })),
            },
          })),
        },
      },
    })

    return NextResponse.json(duplicatedFunnel, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
