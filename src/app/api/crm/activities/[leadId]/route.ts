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
import { db, firstOrNull } from '@/lib/db';
import { checkCRMPermission, CRMFeature } from '@/lib/permissions/crm-permissions';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client imports)
type ActivityType =
  | 'NOTE_ADDED'
  | 'STATUS_CHANGED'
  | 'DOCUMENT_UPLOADED'
  | 'EMAIL_SENT'
  | 'CALL_MADE'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'APPOINTMENT_SCHEDULED'
  | 'FORM_SUBMITTED'
  | 'PAYMENT_RECEIVED'
  | 'ASSIGNED'
  | 'SYSTEM';

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
  { params }: { params: Promise<{ leadId: string }> }
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

    const { leadId } = await params;

    // Verify lead exists and user has access to it
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile to check access
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    // Only admins or assigned preparer can view activities
    const isAdmin = profile?.role === 'admin';
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

    // Valid activity types
    const validActivityTypes: ActivityType[] = [
      'NOTE_ADDED', 'STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'EMAIL_SENT',
      'CALL_MADE', 'TASK_CREATED', 'TASK_COMPLETED', 'APPOINTMENT_SCHEDULED',
      'FORM_SUBMITTED', 'PAYMENT_RECEIVED', 'ASSIGNED', 'SYSTEM'
    ];

    // Build query
    let query = db
      .from('lead_activities')
      .select('*', { count: 'exact' })
      .eq('leadId', leadId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityType && validActivityTypes.includes(activityType)) {
      query = query.eq('activityType', activityType);
    }

    const { data: activities, count } = await query;

    logger.info(`User ${userId} fetched ${(activities || []).length} activities for lead ${leadId}`);

    return NextResponse.json({
      activities: activities || [],
      total: count || 0,
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
  { params }: { params: Promise<{ leadId: string }> }
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

    const { leadId } = await params;

    // Verify lead exists and user has access
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, assignedTo')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .eq('userId', userId)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check access
    const isAdmin = profile.role === 'admin';
    const isAssignedPreparer = lead.assignedTo === profile.id;

    if (!isAdmin && !isAssignedPreparer) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Parse request body
    const { activityType, title, description, metadata } = await req.json();

    // Valid activity types
    const validActivityTypes: ActivityType[] = [
      'NOTE_ADDED', 'STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'EMAIL_SENT',
      'CALL_MADE', 'TASK_CREATED', 'TASK_COMPLETED', 'APPOINTMENT_SCHEDULED',
      'FORM_SUBMITTED', 'PAYMENT_RECEIVED', 'ASSIGNED', 'SYSTEM'
    ];

    // Validate activity type
    if (!activityType || !validActivityTypes.includes(activityType)) {
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

    const { data: activity, error: insertError } = await db
      .from('lead_activities')
      .insert({
        leadId,
        activityType,
        title: title.trim(),
        description: description?.trim() || null,
        metadata: metadata || null,
        createdBy: profile.id,
        createdByName,
        automated: false,
      })
      .select()
      .single();

    if (insertError || !activity) {
      throw new Error(insertError?.message || 'Failed to create activity');
    }

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
