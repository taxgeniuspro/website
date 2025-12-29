/**
 * Mobile Hub Track Share API
 *
 * POST /api/mobile-hub/track-share - Track when a user shares a link
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trackingId, method, url } = body;

    if (!trackingId || !method || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user role from Clerk or default to client
    const userRole = 'tax_preparer'; // TODO: Get from actual user metadata

    // Determine link type from tracking ID
    const linkType = trackingId.split('-')[0]; // e.g., "intake-userId" -> "intake"

    // Create share record
    await db
      .from('mobile_hub_shares')
      .insert({
        user_id: userId,
        user_role: userRole,
        link_type: linkType,
        link_url: url,
        tracking_id: trackingId,
        share_method: method,
      });

    // Increment share count in stats - use findFirst then update/create pattern
    const { data: existingStatsRecords } = await db
      .from('mobile_hub_stats')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const existingStats = firstOrNull(existingStatsRecords);

    if (existingStats) {
      await db
        .from('mobile_hub_stats')
        .update({
          link_shares: (existingStats.link_shares || 0) + 1,
        })
        .eq('id', existingStats.id);
    } else {
      await db
        .from('mobile_hub_stats')
        .insert({
          user_id: userId,
          user_role: userRole,
          link_shares: 1,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Share tracked successfully',
    });
  } catch (error) {
    logger.error('Error tracking share:', error);
    return NextResponse.json({ error: 'Failed to track share' }, { status: 500 });
  }
}
