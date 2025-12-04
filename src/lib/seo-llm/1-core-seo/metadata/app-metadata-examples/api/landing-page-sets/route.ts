import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * GET /api/landing-page-sets
 * List all landing page sets with metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const landingPageSets = await prisma.landingPageSet.findMany({
      where,
      include: {
        PaperStockSet: {
          select: { name: true },
        },
        QuantityGroup: {
          select: { name: true },
        },
        SizeGroup: {
          select: { name: true },
        },
        AddOnSet: {
          select: { name: true },
        },
        TurnaroundTimeSet: {
          select: { name: true },
        },
        _count: {
          select: {
            CityLandingPage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate aggregate metrics for each set
    const setsWithMetrics = await Promise.all(
      landingPageSets.map(async (set) => {
        const cityPages = await prisma.cityLandingPage.findMany({
          where: { landingPageSetId: set.id },
          select: {
            organicViews: true,
            orders: true,
            revenue: true,
            conversionRate: true,
          },
        })

        const totalViews = cityPages.reduce((sum, page) => sum + page.organicViews, 0)
        const totalOrders = cityPages.reduce((sum, page) => sum + page.orders, 0)
        const totalRevenue = cityPages.reduce((sum, page) => sum + page.revenue, 0)
        const avgConversionRate =
          cityPages.length > 0
            ? cityPages.reduce((sum, page) => sum + (page.conversionRate || 0), 0) /
              cityPages.length
            : 0

        return {
          ...set,
          metrics: {
            citiesGenerated: set._count.CityLandingPage,
            totalViews,
            totalOrders,
            totalRevenue,
            avgConversionRate: Math.round(avgConversionRate * 100) / 100,
          },
        }
      })
    )

    return NextResponse.json(setsWithMetrics)
  } catch (error) {
    console.error('[GET /api/landing-page-sets] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch landing page sets' }, { status: 500 })
  }
}

/**
 * POST /api/landing-page-sets
 * Create a new landing page set (DRAFT)
 */
export async function POST(request: NextRequest) {
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
      paperStockSetId,
      quantityGroupId,
      sizeGroupId,
      addOnSetId,
      turnaroundTimeSetId,
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

    // Validate required fields
    if (!name || !paperStockSetId || !quantityGroupId || !sizeGroupId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, paperStockSetId, quantityGroupId, sizeGroupId' },
        { status: 400 }
      )
    }

    if (!titleTemplate || !metaDescTemplate || !h1Template || !contentTemplate) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists
    const existing = await prisma.landingPageSet.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A landing page set with this name already exists' },
        { status: 400 }
      )
    }

    // Verify foreign key references exist
    const [paperStockSet, quantityGroup, sizeGroup] = await Promise.all([
      prisma.paperStockSet.findUnique({ where: { id: paperStockSetId } }),
      prisma.quantityGroup.findUnique({ where: { id: quantityGroupId } }),
      prisma.sizeGroup.findUnique({ where: { id: sizeGroupId } }),
    ])

    if (!paperStockSet || !quantityGroup || !sizeGroup) {
      return NextResponse.json(
        { error: 'Invalid product configuration references' },
        { status: 400 }
      )
    }

    // Create landing page set in DRAFT status
    const landingPageSet = await prisma.landingPageSet.create({
      data: {
        id: randomUUID(),
        name,
        slug,
        status: 'draft',
        paperStockSetId,
        quantityGroupId,
        sizeGroupId,
        addOnSetId: addOnSetId || null,
        turnaroundTimeSetId: turnaroundTimeSetId || null,
        titleTemplate,
        metaDescTemplate,
        h1Template,
        contentTemplate,
        aiGenerationPrompt: aiGenerationPrompt || null,
        generateIntro: generateIntro !== undefined ? generateIntro : true,
        generateBenefits: generateBenefits !== undefined ? generateBenefits : true,
        generateFAQs: generateFAQs !== undefined ? generateFAQs : true,
        generateCaseStudy: generateCaseStudy !== undefined ? generateCaseStudy : false,
        robotsIndex: robotsIndex !== undefined ? robotsIndex : true,
        robotsFollow: robotsFollow !== undefined ? robotsFollow : true,
        canonicalUrl: canonicalUrl || null,
        urgencyEnabled: urgencyEnabled !== undefined ? urgencyEnabled : true,
        discountEnabled: discountEnabled !== undefined ? discountEnabled : false,
        discountPercent: discountPercent || null,
        chatWidgetEnabled: chatWidgetEnabled !== undefined ? chatWidgetEnabled : true,
      },
      include: {
        PaperStockSet: true,
        QuantityGroup: true,
        SizeGroup: true,
        AddOnSet: true,
        TurnaroundTimeSet: true,
      },
    })

    return NextResponse.json(landingPageSet, { status: 201 })
  } catch (error) {
    console.error('[POST /api/landing-page-sets] Error:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A landing page set with this slug already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create landing page set' }, { status: 500 })
  }
}
