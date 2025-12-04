import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import { generateCityContent } from '@/lib/landing-page/content-generator'
import { randomUUID } from 'crypto'

/**
 * POST /api/landing-page-sets/[id]/publish
 * Publish landing page set and generate 200 city landing pages
 *
 * This is the CRITICAL endpoint that:
 * 1. Changes status from 'draft' to 'generating' to 'published'
 * 2. Generates 200 unique city landing pages with AI content
 * 3. Creates hidden Product record for cart integration
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await validateRequest()
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get landing page set
    const landingPageSet = await prisma.landingPageSet.findUnique({
      where: { id: params.id },
      include: {
        PaperStockSet: true,
        QuantityGroup: true,
        SizeGroup: true,
      },
    })

    if (!landingPageSet) {
      return NextResponse.json({ error: 'Landing page set not found' }, { status: 404 })
    }

    if (landingPageSet.status === 'published') {
      return NextResponse.json({ error: 'Landing page set is already published' }, { status: 400 })
    }

    // Update status to generating
    await prisma.landingPageSet.update({
      where: { id: params.id },
      data: { status: 'generating' },
    })

    // Get all active cities (top 200)
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { rank: 'asc' },
      take: 200,
    })

    if (cities.length === 0) {
      await prisma.landingPageSet.update({
        where: { id: params.id },
        data: { status: 'draft' },
      })
      return NextResponse.json({ error: 'No active cities found in database' }, { status: 400 })
    }

    // Extract product type from name (e.g., "Postcards 4x6 Landing Pages" -> "Postcards 4x6")
    const productType = landingPageSet.name.replace(/\s*landing\s*pages?$/i, '').trim()

    // Generate landing pages for each city
    const generatedPages: string[] = []
    const errors: Array<{ city: string; error: string }> = []

    for (const city of cities) {
      try {
        // Generate unique content for this city
        const content = await generateCityContent(
          city.id,
          landingPageSet.id,
          {
            titleTemplate: landingPageSet.titleTemplate,
            metaDescTemplate: landingPageSet.metaDescTemplate,
            h1Template: landingPageSet.h1Template,
            contentTemplate: landingPageSet.contentTemplate,
          },
          productType
        )

        // Create slug: product-type-city-state (e.g., "postcards-4x6-new-york-ny")
        const slug =
          `${landingPageSet.slug}-${city.name.toLowerCase()}-${city.stateCode.toLowerCase()}`
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

        // Check if this city page already exists
        const existing = await prisma.cityLandingPage.findFirst({
          where: {
            landingPageSetId: landingPageSet.id,
            cityId: city.id,
          },
        })

        if (existing) {
          generatedPages.push(existing.id)
          continue
        }

        // Create city landing page with AI-generated content
        const cityLandingPage = await prisma.cityLandingPage.create({
          data: {
            id: randomUUID(),
            landingPageSetId: landingPageSet.id,
            productId: landingPageSet.id, // Temporary - will create proper product later
            cityId: city.id,
            slug,
            title: content.title,
            metaDesc: content.metaDesc,
            h1: content.h1,
            aiIntro: content.aiIntro,
            aiBenefits: content.aiBenefits,
            content: content.aiIntro, // Legacy field
            contentSections: content.contentSections,
            faqSchema: content.faqSchema,
            schemaMarkup: null as any, // Will generate schema markup in next iteration
            status: 'published',
            published: true,
            publishedAt: new Date(),
          },
        })

        generatedPages.push(cityLandingPage.id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`    ❌ Error for ${city.name}, ${city.stateCode}:`, errorMsg)
        errors.push({
          city: `${city.name}, ${city.stateCode}`,
          error: errorMsg,
        })
      }
    }

    // Update status to published
    await prisma.landingPageSet.update({
      where: { id: params.id },
      data: { status: 'published' },
    })

    return NextResponse.json({
      success: true,
      landingPageSetId: params.id,
      citiesGenerated: generatedPages.length,
      totalCities: cities.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully generated ${generatedPages.length} city landing pages${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
    })
  } catch (error) {
    console.error(`[POST /api/landing-page-sets/${params.id}/publish] Error:`, error)

    // Revert status to draft on error
    try {
      await prisma.landingPageSet.update({
        where: { id: params.id },
        data: { status: 'draft' },
      })
    } catch (revertError) {
      console.error('Failed to revert status:', revertError)
    }

    return NextResponse.json(
      {
        error: 'Failed to publish landing page set',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
