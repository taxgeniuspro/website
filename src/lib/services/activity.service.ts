/**
 * Activity Service
 *
 * Service for programmatically creating lead activities.
 * Used by automation systems, email tracking, and workflow engines.
 *
 * @module lib/services/activity
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ActivityType } from '@prisma/client';

export interface CreateActivityParams {
  leadId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdBy?: string; // Profile ID
  createdByName?: string;
  automated?: boolean;
}

/**
 * Create a new activity for a lead
 *
 * @example
 * ```typescript
 * await createActivity({
 *   leadId: 'lead_123',
 *   activityType: ActivityType.EMAIL_SENT,
 *   title: 'Welcome email sent',
 *   description: 'Automated welcome sequence email #1',
 *   metadata: { emailId: 'email_456', campaignId: 'campaign_789' },
 *   automated: true,
 * });
 * ```
 */
export async function createActivity(params: CreateActivityParams) {
  try {
    const {
      leadId,
      activityType,
      title,
      description,
      metadata,
      createdBy,
      createdByName,
      automated = false,
    } = params;

    // Verify lead exists
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      logger.error(`Cannot create activity: Lead ${leadId} not found`);
      return { success: false, error: 'Lead not found' };
    }

    // If createdBy is provided but no name, fetch it
    let finalCreatedByName = createdByName;
    if (createdBy && !createdByName) {
      const profile = await prisma.profile.findUnique({
        where: { id: createdBy },
        select: { firstName: true, lastName: true },
      });

      if (profile) {
        finalCreatedByName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
      }
    }

    // Create activity
    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        activityType,
        title: title.trim(),
        description: description?.trim() || null,
        metadata: metadata || null,
        createdBy: createdBy || null,
        createdByName: finalCreatedByName || (automated ? 'System' : 'Unknown'),
        automated,
      },
    });

    logger.info(`Activity created for lead ${leadId}`, {
      activityId: activity.id,
      activityType,
      automated,
    });

    return { success: true, activity };
  } catch (error) {
    logger.error('Error creating activity:', error);
    return { success: false, error: 'Failed to create activity' };
  }
}

/**
 * Log a contact attempt
 */
export async function logContactAttempt(
  leadId: string,
  method: 'phone' | 'email' | 'sms',
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.CONTACT_ATTEMPTED,
    title: `Contact attempted via ${method}`,
    createdBy: preparerId,
    createdByName: preparerName,
    metadata: { method },
  });
}

/**
 * Log a successful contact
 */
export async function logContactMade(
  leadId: string,
  method: 'phone' | 'email' | 'sms' | 'in-person',
  notes?: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.CONTACT_MADE,
    title: `Contact made via ${method}`,
    description: notes,
    createdBy: preparerId,
    createdByName: preparerName,
    metadata: { method },
  });
}

/**
 * Log email sent
 */
export async function logEmailSent(
  leadId: string,
  subject: string,
  emailId?: string,
  campaignId?: string,
  automated: boolean = false
) {
  return createActivity({
    leadId,
    activityType: ActivityType.EMAIL_SENT,
    title: subject,
    description: automated ? 'Automated email campaign' : 'Manual email sent',
    metadata: { emailId, campaignId },
    automated,
  });
}

/**
 * Log email opened
 */
export async function logEmailOpened(leadId: string, emailId: string, openCount: number = 1) {
  // Update lead email opens counter
  await prisma.taxIntakeLead.update({
    where: { id: leadId },
    data: { emailOpens: { increment: 1 } },
  });

  return createActivity({
    leadId,
    activityType: ActivityType.EMAIL_OPENED,
    title: 'Email opened',
    description: openCount > 1 ? `Opened ${openCount} times` : 'First open',
    metadata: { emailId, openCount },
    automated: true,
  });
}

/**
 * Log email link clicked
 */
export async function logEmailClicked(leadId: string, emailId: string, url: string) {
  // Update lead email clicks counter
  await prisma.taxIntakeLead.update({
    where: { id: leadId },
    data: { emailClicks: { increment: 1 } },
  });

  return createActivity({
    leadId,
    activityType: ActivityType.EMAIL_CLICKED,
    title: 'Email link clicked',
    description: `Clicked: ${url}`,
    metadata: { emailId, url },
    automated: true,
  });
}

/**
 * Log status change
 */
export async function logStatusChange(
  leadId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.STATUS_CHANGED,
    title: `Status changed: ${fromStatus} → ${toStatus}`,
    description: reason,
    metadata: { fromStatus, toStatus },
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log note added
 */
export async function logNoteAdded(
  leadId: string,
  title: string,
  note: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.NOTE_ADDED,
    title,
    description: note,
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log task created
 */
export async function logTaskCreated(
  leadId: string,
  taskTitle: string,
  taskId?: string,
  dueDate?: Date,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.TASK_CREATED,
    title: `Task created: ${taskTitle}`,
    description: dueDate ? `Due: ${dueDate.toLocaleDateString()}` : undefined,
    metadata: { taskId, dueDate: dueDate?.toISOString() },
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log task completed
 */
export async function logTaskCompleted(
  leadId: string,
  taskTitle: string,
  taskId?: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.TASK_COMPLETED,
    title: `Task completed: ${taskTitle}`,
    metadata: { taskId },
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log form viewed
 */
export async function logFormViewed(leadId: string, formName: string) {
  // Update lastViewedAt
  await prisma.taxIntakeLead.update({
    where: { id: leadId },
    data: { lastViewedAt: new Date() },
  });

  return createActivity({
    leadId,
    activityType: ActivityType.FORM_VIEWED,
    title: `Form viewed: ${formName}`,
    automated: true,
  });
}

/**
 * Log document uploaded
 */
export async function logDocumentUploaded(
  leadId: string,
  fileName: string,
  fileType?: string,
  fileSize?: number
) {
  return createActivity({
    leadId,
    activityType: ActivityType.DOCUMENT_UPLOADED,
    title: `Document uploaded: ${fileName}`,
    metadata: { fileName, fileType, fileSize },
    automated: true,
  });
}

/**
 * Log meeting scheduled
 */
export async function logMeetingScheduled(
  leadId: string,
  meetingDate: Date,
  meetingType: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.MEETING_SCHEDULED,
    title: `${meetingType} scheduled`,
    description: `Scheduled for ${meetingDate.toLocaleString()}`,
    metadata: { meetingDate: meetingDate.toISOString(), meetingType },
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log meeting completed
 */
export async function logMeetingCompleted(
  leadId: string,
  meetingType: string,
  notes?: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.MEETING_COMPLETED,
    title: `${meetingType} completed`,
    description: notes,
    metadata: { meetingType },
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log lead conversion
 */
export async function logLeadConverted(
  leadId: string,
  preparerId?: string,
  preparerName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.CONVERTED,
    title: 'Lead converted to client',
    description: 'Successfully converted to paying client',
    createdBy: preparerId,
    createdByName: preparerName,
  });
}

/**
 * Log lead assignment
 */
export async function logLeadAssigned(
  leadId: string,
  assignedToName: string,
  assignedById?: string,
  assignedByName?: string
) {
  return createActivity({
    leadId,
    activityType: ActivityType.ASSIGNED,
    title: `Lead assigned to ${assignedToName}`,
    description: assignedByName ? `Assigned by ${assignedByName}` : 'Auto-assigned',
    createdBy: assignedById,
    createdByName: assignedByName,
    automated: !assignedById,
  });
}

/**
 * Get activity statistics for a lead
 */
export async function getLeadActivityStats(leadId: string) {
  const activities = await prisma.leadActivity.groupBy({
    by: ['activityType'],
    where: { leadId },
    _count: true,
  });

  const stats: Record<string, number> = {};
  activities.forEach((activity) => {
    stats[activity.activityType] = activity._count;
  });

  return stats;
}

/**
 * Get recent activities across all leads (for dashboard)
 */
export async function getRecentActivities(preparerId?: string, limit: number = 10) {
  const where: any = {};

  if (preparerId) {
    // Only show activities for leads assigned to this preparer
    where.lead = {
      assignedTo: preparerId,
    };
  }

  const activities = await prisma.leadActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      lead: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  return activities;
}
