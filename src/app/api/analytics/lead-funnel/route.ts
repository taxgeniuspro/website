/**
 * Lead Funnel Analytics API
 *
 * GET /api/analytics/lead-funnel
 * Returns funnel data: clicks → intake started → completed → assigned → converted
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay } from 'date-fns';

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
      const profile = await prisma.profile.findUnique({
        where: { userId: preparerId || user.id },
        select: { id: true },
      });
      profileId = profile?.id || null;
    }

    // Get click data from MarketingLink analytics
    const clicksData = await prisma.marketingLink.aggregate({
      where: {
        ...(profileId && { profileId }),
        createdAt: { gte: startDate },
      },
      _sum: {
        clicks: true,
      },
    });

    // Get leads at various stages
    const leadsFilter = {
      created_at: { gte: startDate },
      ...(profileId && { assignedPreparerId: profileId }),
    };

    const [intakeStarted, intakeCompleted, assigned, converted] = await Promise.all([
      // Intake started (all leads created)
      prisma.taxIntakeLead.count({
        where: leadsFilter,
      }),
      // Intake completed
      prisma.taxIntakeLead.count({
        where: {
          ...leadsFilter,
          completed: true,
        },
      }),
      // Assigned to preparer
      prisma.taxIntakeLead.count({
        where: {
          ...leadsFilter,
          assignedPreparerId: { not: null },
        },
      }),
      // Converted to client
      prisma.taxIntakeLead.count({
        where: {
          ...leadsFilter,
          convertedToClient: true,
        },
      }),
    ]);

    return NextResponse.json({
      clicks: clicksData._sum.clicks || 0,
      intakeStarted,
      intakeCompleted,
      assigned,
      converted,
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
