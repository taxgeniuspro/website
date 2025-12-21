/**
 * Activity Feed Analytics API
 *
 * GET /api/analytics/activity-feed
 * Returns recent activity items for real-time feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subHours, subDays } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'new_lead' | 'intake_completed' | 'appointment_booked' | 'follow_up_needed' | 'conversion';
  title: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'medium' | 'low';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const preparerId = searchParams.get('preparerId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const role = user.role as string;
    let profileId: string | null = null;

    if (role === 'tax_preparer' || preparerId) {
      const profile = await prisma.profile.findUnique({
        where: { userId: preparerId || user.id },
        select: { id: true },
      });
      profileId = profile?.id || null;
    }

    const now = new Date();
    const last24Hours = subHours(now, 24);
    const last7Days = subDays(now, 7);

    // Build filter
    const baseFilter = profileId ? { assignedPreparerId: profileId } : {};

    // Get recent leads
    const recentLeads = await prisma.taxIntakeLead.findMany({
      where: {
        ...baseFilter,
        created_at: { gte: last7Days },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        completed: true,
        convertedToClient: true,
        created_at: true,
        lastContactedAt: true,
      },
    });

    // Build activity items from leads
    const activities: ActivityItem[] = recentLeads.map((lead) => {
      // Determine activity type and priority
      let type: ActivityItem['type'] = 'new_lead';
      let priority: ActivityItem['priority'] = 'low';
      let title = `New lead: ${lead.first_name} ${lead.last_name}`;
      let description = lead.email;

      if (lead.convertedToClient) {
        type = 'conversion';
        title = `Converted: ${lead.first_name} ${lead.last_name}`;
        description = 'Successfully converted to client';
      } else if (lead.completed) {
        type = 'intake_completed';
        title = `Intake completed: ${lead.first_name} ${lead.last_name}`;
        description = 'Ready for follow-up';
        priority = 'medium';
      } else if (!lead.lastContactedAt && new Date(lead.created_at) < subHours(now, 4)) {
        type = 'follow_up_needed';
        title = `Follow-up needed: ${lead.first_name} ${lead.last_name}`;
        description = 'No contact made yet';
        priority = 'high';
      }

      return {
        id: lead.id,
        type,
        title,
        description,
        timestamp: lead.created_at.toISOString(),
        priority,
      };
    });

    // Sort by priority and timestamp
    activities.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority || 'low']) - (priorityOrder[b.priority || 'low']);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Count stats
    const newLeadsCount = recentLeads.filter(
      (l) => new Date(l.created_at) >= last24Hours
    ).length;

    const hotLeadsCount = recentLeads.filter(
      (l) => !l.lastContactedAt && !l.convertedToClient && new Date(l.created_at) < subHours(now, 4)
    ).length;

    return NextResponse.json({
      activities: activities.slice(0, limit),
      newLeadsCount,
      hotLeadsCount,
    });
  } catch (error) {
    console.error('Activity feed API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}
