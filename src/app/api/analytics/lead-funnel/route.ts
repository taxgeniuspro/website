/**
 * Lead Funnel Analytics API
 *
 * GET /api/analytics/lead-funnel
 * Returns funnel data: clicks → intake started → completed → assigned → converted
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { subDays, startOfDay } from 'date-fns';

interface MarketingLinkRow {
  clicks: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const preparerId = searchParams.get('preparerId');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = subDays(now, 30);
    }
    startDate = startOfDay(startDate);

    // Build filter based on role and preparerId
    const role = user.role as string;
    let profileId: string | null = null;

    if (role === 'tax_preparer' || preparerId) {
      const { data: profileData } = await db
        .from('profiles')
        .select('id')
        .eq('userId', preparerId || user.id)
        .limit(1);
      profileId = firstOrNull(profileData)?.id || null;
    }

    // Get click data from MarketingLink analytics
    let clicksQuery = db
      .from('marketing_links')
      .select('clicks')
      .gte('createdAt', startDate.toISOString());

    if (profileId) {
      clicksQuery = clicksQuery.eq('profileId', profileId);
    }

    const { data: clicksData } = await clicksQuery;
    const totalClicks = ((clicksData || []) as MarketingLinkRow[]).reduce(
      (sum, l) => sum + (l.clicks || 0),
      0
    );

    // Get leads at various stages using count queries
    const startDateIso = startDate.toISOString();

    // Build base query conditions
    let intakeStartedQuery = db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDateIso);

    let intakeCompletedQuery = db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDateIso)
      .eq('completed', true);

    let assignedQuery = db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDateIso)
      .not('assignedPreparerId', 'is', null);

    let convertedQuery = db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDateIso)
      .eq('convertedToClient', true);

    if (profileId) {
      intakeStartedQuery = intakeStartedQuery.eq('assignedPreparerId', profileId);
      intakeCompletedQuery = intakeCompletedQuery.eq('assignedPreparerId', profileId);
      assignedQuery = assignedQuery.eq('assignedPreparerId', profileId);
      convertedQuery = convertedQuery.eq('assignedPreparerId', profileId);
    }

    const [
      { count: intakeStarted },
      { count: intakeCompleted },
      { count: assigned },
      { count: converted },
    ] = await Promise.all([
      intakeStartedQuery,
      intakeCompletedQuery,
      assignedQuery,
      convertedQuery,
    ]);

    return NextResponse.json({
      clicks: totalClicks,
      intakeStarted: intakeStarted || 0,
      intakeCompleted: intakeCompleted || 0,
      assigned: assigned || 0,
      converted: converted || 0,
      dateRange,
    });
  } catch (error) {
    console.error('Lead funnel API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
