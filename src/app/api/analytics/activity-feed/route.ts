/**
 * Activity Feed Analytics API
 *
 * GET /api/analytics/activity-feed
 * Returns recent activity items for real-time feed
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { subHours, subDays } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'new_lead' | 'intake_completed' | 'appointment_booked' | 'follow_up_needed' | 'conversion';
  title: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'medium' | 'low';
}

interface TaxIntakeLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  completed: boolean;
  convertedToClient: boolean;
  created_at: string;
  lastContactedAt: string | null;
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
      const { data: profileData } = await db
        .from('profiles')
        .select('id')
        .eq('userId', preparerId || user.id)
        .limit(1);
      profileId = firstOrNull(profileData)?.id || null;
    }

    const now = new Date();
    const last24Hours = subHours(now, 24);
    const last7Days = subDays(now, 7);

    // Build query for recent leads
    let query = db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, completed, convertedToClient, created_at, lastContactedAt')
      .gte('created_at', last7Days.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profileId) {
      query = query.eq('assignedPreparerId', profileId);
    }

    const { data: recentLeads, error } = await query;

    if (error) {
      throw error;
    }

    const leads = (recentLeads || []) as TaxIntakeLead[];

    // Build activity items from leads
    const activities: ActivityItem[] = leads.map((lead) => {
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
        timestamp: lead.created_at,
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
    const newLeadsCount = leads.filter(
      (l) => new Date(l.created_at) >= last24Hours
    ).length;

    const hotLeadsCount = leads.filter(
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
