/**
 * Short Link Detail API
 *
 * GET /api/links/[code] - Get specific link
 * PATCH /api/links/[code] - Update link
 * DELETE /api/links/[code] - Delete link
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getShortLinkByCode,
  updateShortLink,
  deleteShortLink,
  getShortLinkAnalytics,
} from '@/lib/services/short-link.service';

// TypeScript interface for Profile
interface Profile {
  id: string;
}

/**
 * GET - Get short link details
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile with flexible lookup
    const { data: profileData, error: findError } = await db
      .from('profiles')
      .select('id')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { code } = await params;

    // Get link with analytics
    const analytics = await getShortLinkAnalytics(code, profile.id);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('Error fetching short link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH - Update short link
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile with flexible lookup
    const { data: profileData, error: findError } = await db
      .from('profiles')
      .select('id')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { code } = await params;
    const body = await req.json();

    // Update link
    const updated = await updateShortLink(code, profile.id, {
      title: body.title,
      description: body.description,
      isActive: body.isActive,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Short link updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating short link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete short link
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile with flexible lookup
    const { data: profileData, error: findError } = await db
      .from('profiles')
      .select('id')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (findError) {
      throw findError;
    }

    const profile = firstOrNull(profileData) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { code } = await params;

    // Delete link
    await deleteShortLink(code, profile.id);

    return NextResponse.json({
      success: true,
      message: 'Short link deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting short link:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
