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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces (replaces @prisma/client types)
interface Profile {
  id: string;
  short_link_username: string | null;
  role: string | null;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  type: string;
  attribution_method: string | null;
  attribution_confidence: number | null;
  commission_rate: number | null;
  created_at: string;
  source: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username using flexible lookup
    const { data: profiles } = await db.from('profiles')
      .select('id, short_link_username, role')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId}${session?.user?.email ? `,email.eq.${session.user.email}` : ''}`)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile || !profile.short_link_username) {
      return NextResponse.json({
        leads: [],
        total: 0,
      });
    }

    // Get limit parameter
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch leads attributed to this user
    const { data: leads, error: leadsError } = await db.from('leads')
      .select('id, first_name, last_name, email, phone, status, type, attribution_method, attribution_confidence, commission_rate, created_at, source')
      .eq('referrer_username', profile.short_link_username)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    // Get total count
    const { count, error: countError } = await db.from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_username', profile.short_link_username);

    if (countError) {
      throw new Error(`Failed to count leads: ${countError.message}`);
    }

    return NextResponse.json({
      leads: (leads || []).map((lead: Lead) => ({
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        type: lead.type,
        attributionMethod: lead.attribution_method || 'direct',
        attributionConfidence: lead.attribution_confidence,
        commissionRate: Number(lead.commission_rate) || 0,
        createdAt: lead.created_at,
        source: lead.source,
      })),
      total: count || 0,
    });
  } catch (error) {
    logger.error('Error fetching my leads', { error });
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
