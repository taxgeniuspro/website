import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { ABTestingService } from '@/lib/marketing/ab-testing'
import { type ABTestType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId, name, description, testType, variants, winnerCriteria, confidence } =
      await request.json()

    if (!campaignId || !name || !testType || !variants || !winnerCriteria) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const abTest = await ABTestingService.createABTest(
      campaignId,
      name,
      description,
      testType as ABTestType,
      variants,
      winnerCriteria,
      confidence
    )

    return NextResponse.json(abTest, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
