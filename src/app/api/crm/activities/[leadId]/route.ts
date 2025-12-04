/**
 * CRM Lead Activities API
 *
 * GET /api/crm/activities/[leadId]
 * Fetches all activities for a specific lead.
 *
 * POST /api/crm/activities/[leadId]
 * Creates a new activity for a lead.
 *
 * @module api/crm/activities/[leadId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';
import { ActivityType } from '@prisma/client';

/**
 * GET /api/crm/activities/[leadId]
 *
 * Query params:
 * - limit: Number of activities to fetch (default: 50)
 * - offset: Pagination offset (default: 0)
 * - type: Filter by activity type (optional)
 *
 * Response:
 * {
 *   "activities": [...],
 *   "total": 123
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.ACTIVITY_TRACKING);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to view activity timeline' },
        { status: 403 }
      );
    }

    const leadId = params.leadId;

    // Verify lead exists and user has access to it
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedTo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile to check access
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    // Only admins or assigned preparer can view activities
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isAssignedPreparer = lead.assignedTo === profile?.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activityType = searchParams.get('type') as ActivityType | null;

    // Build where clause
    const where: any = { leadId };
    if (activityType && Object.values(ActivityType).includes(activityType)) {
      where.activityType = activityType;
    }

    // Fetch activities
    const [activities, total] = await Promise.all([
      prisma.leadActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.leadActivity.count({ where }),
    ]);

    logger.info(`User ${userId} fetched ${activities.length} activities for lead ${leadId}`);

    return NextResponse.json({
      activities,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error fetching lead activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

/**
 * POST /api/crm/activities/[leadId]
 *
 * Request body:
 * {
 *   "activityType": "NOTE_ADDED",
 *   "title": "Follow-up call scheduled",
 *   "description": "Scheduled follow-up call for next Monday at 2pm",
 *   "metadata": { "scheduledFor": "2025-01-15T14:00:00Z" }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "activity": {...}
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check permission
    const permissionCheck = await checkCRMPermission(userId, CRMFeature.ACTIVITY_TRACKING);
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'You do not have permission to create activities' },
        { status: 403 }
      );
    }

    const leadId = params.leadId;

    // Verify lead exists and user has access
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        assignedTo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check access
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    const isAssignedPreparer = lead.assignedTo === profile.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Parse request body
    const { activityType, title, description, metadata } = await req.json();

    // Validate activity type
    if (!activityType || !Object.values(ActivityType).includes(activityType)) {
      return NextResponse.json(
        { error: 'Invalid activity type' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create activity
    const createdByName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        activityType,
        title: title.trim(),
        description: description?.trim() || null,
        metadata: metadata || null,
        createdBy: profile.id,
        createdByName,
        automated: false,
      },
    });

    logger.info(`User ${userId} created activity for lead ${leadId}`, {
      activityType,
      activityId: activity.id,
    });

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    logger.error('Error creating lead activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
