import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { CampaignService } from '@/lib/marketing/campaign-service'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await validateRequest()
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await CampaignService.sendCampaign(params.id)

    return NextResponse.json({ success: true, message: 'Campaign sent successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
