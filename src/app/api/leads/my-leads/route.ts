/**
 * My Leads API
 *
 * GET /api/leads/my-leads?limit=10
 * Returns leads attributed to the authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({
        leads: [],
        total: 0,
      });
    }

    // Get limit parameter
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch leads attributed to this user
    const leads = await prisma.lead.findMany({
      where: {
        referrerUsername: profile.shortLinkUsername,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        type: true,
        attributionMethod: true,
        attributionConfidence: true,
        commissionRate: true,
        createdAt: true,
        source: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get total count
    const total = await prisma.lead.count({
      where: {
        referrerUsername: profile.shortLinkUsername,
      },
    });

    return NextResponse.json({
      leads: leads.map((lead) => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        type: lead.type,
        attributionMethod: lead.attributionMethod || 'direct',
        attributionConfidence: lead.attributionConfidence,
        commissionRate: Number(lead.commissionRate) || 0,
        createdAt: lead.createdAt.toISOString(),
        source: lead.source,
      })),
      total,
    });
  } catch (error) {
    logger.error('Error fetching my leads', { error });
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
