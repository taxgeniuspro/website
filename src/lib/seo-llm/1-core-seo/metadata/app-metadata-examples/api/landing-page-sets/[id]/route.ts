import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

/**
 * GET /api/landing-page-sets/[id]
 * Get single landing page set with full details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await validateRequest()
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const landingPageSet = await prisma.landingPageSet.findUnique({
      where: { id: params.id },
      include: {
        PaperStockSet: true,
        QuantityGroup: true,
        SizeGroup: true,
        AddOnSet: true,
        TurnaroundTimeSet: true,
        _count: {
          select: {
            CityLandingPage: true,
          },
        },
      },
    })

    if (!landingPageSet) {
      return NextResponse.json({ error: 'Landing page set not found' }, { status: 404 })
    }

    // Get aggregate metrics
    const cityPages = await prisma.cityLandingPage.findMany({
      where: { landingPageSetId: params.id },
      select: {
        organicViews: true,
        orders: true,
        revenue: true,
        conversionRate: true,
      },
    })

    const metrics = {
      citiesGenerated: landingPageSet._count.CityLandingPage,
      totalViews: cityPages.reduce((sum, page) => sum + page.organicViews, 0),
      totalOrders: cityPages.reduce((sum, page) => sum + page.orders, 0),
      totalRevenue: cityPages.reduce((sum, page) => sum + page.revenue, 0),
      avgConversionRate:
        cityPages.length > 0
          ? cityPages.reduce((sum, page) => sum + (page.conversionRate || 0), 0) / cityPages.length
          : 0,
    }

    return NextResponse.json({
      ...landingPageSet,
      metrics,
    })
  } catch (error) {
    console.error(`[GET /api/landing-page-sets/${params.id}] Error:`, error)
    return NextResponse.json({ error: 'Failed to fetch landing page set' }, { status: 500 })
  }
}

/**
 * PUT /api/landing-page-sets/[id]
 * Update landing page set template
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await validateRequest()
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      titleTemplate,
      metaDescTemplate,
      h1Template,
      contentTemplate,
      aiGenerationPrompt,
      generateIntro,
      generateBenefits,
      generateFAQs,
      generateCaseStudy,
      robotsIndex,
      robotsFollow,
      canonicalUrl,
      urgencyEnabled,
      discountEnabled,
      discountPercent,
      chatWidgetEnabled,
    } = body

    // Check if landing page set exists
    const existing = await prisma.landingPageSet.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Landing page set not found' }, { status: 404 })
    }

    // Don't allow updating if it's published (must archive first)
    if (existing.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot update published landing page set. Archive it first.' },
        { status: 400 }
      )
    }

    // Update the set
    const updated = await prisma.landingPageSet.update({
      where: { id: params.id },
      data: {
        name: name || existing.name,
        titleTemplate: titleTemplate || existing.titleTemplate,
        metaDescTemplate: metaDescTemplate || existing.metaDescTemplate,
        h1Template: h1Template || existing.h1Template,
        contentTemplate: contentTemplate || existing.contentTemplate,
        aiGenerationPrompt:
          aiGenerationPrompt !== undefined ? aiGenerationPrompt : existing.aiGenerationPrompt,
        generateIntro: generateIntro !== undefined ? generateIntro : existing.generateIntro,
        generateBenefits:
          generateBenefits !== undefined ? generateBenefits : existing.generateBenefits,
        generateFAQs: generateFAQs !== undefined ? generateFAQs : existing.generateFAQs,
        generateCaseStudy:
          generateCaseStudy !== undefined ? generateCaseStudy : existing.generateCaseStudy,
        robotsIndex: robotsIndex !== undefined ? robotsIndex : existing.robotsIndex,
        robotsFollow: robotsFollow !== undefined ? robotsFollow : existing.robotsFollow,
        canonicalUrl: canonicalUrl !== undefined ? canonicalUrl : existing.canonicalUrl,
        urgencyEnabled: urgencyEnabled !== undefined ? urgencyEnabled : existing.urgencyEnabled,
        discountEnabled: discountEnabled !== undefined ? discountEnabled : existing.discountEnabled,
        discountPercent: discountPercent !== undefined ? discountPercent : existing.discountPercent,
        chatWidgetEnabled:
          chatWidgetEnabled !== undefined ? chatWidgetEnabled : existing.chatWidgetEnabled,
      },
      include: {
        PaperStockSet: true,
        QuantityGroup: true,
        SizeGroup: true,
        AddOnSet: true,
        TurnaroundTimeSet: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(`[PUT /api/landing-page-sets/${params.id}] Error:`, error)
    return NextResponse.json({ error: 'Failed to update landing page set' }, { status: 500 })
  }
}

/**
 * DELETE /api/landing-page-sets/[id]
 * Delete landing page set and all associated city pages (CASCADE)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await validateRequest()
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if exists
    const existing = await prisma.landingPageSet.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { CityLandingPage: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Landing page set not found' }, { status: 404 })
    }

    // Delete (will cascade to all city landing pages)
    await prisma.landingPageSet.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: `Deleted landing page set and ${existing._count.CityLandingPage} city pages`,
    })
  } catch (error) {
    console.error(`[DELETE /api/landing-page-sets/${params.id}] Error:`, error)
    return NextResponse.json({ error: 'Failed to delete landing page set' }, { status: 500 })
  }
}
