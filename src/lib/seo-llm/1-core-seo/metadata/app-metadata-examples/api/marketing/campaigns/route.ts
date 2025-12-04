import { type NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth'
import { CampaignService } from '@/lib/marketing/campaign-service'
import { type CampaignStatus, type CampaignType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') as CampaignStatus | undefined
    const type = searchParams.get('type') as CampaignType | undefined
    const search = searchParams.get('search') || undefined

    const result = await CampaignService.getCampaigns(page, limit, {
      status,
      type,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, session } = await validateRequest()
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const campaign = await CampaignService.createCampaign({
      ...data,
      createdBy: user.email || user?.id || 'system',
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
