/**
 * Activity Service
 *
 * Service for programmatically creating lead activities.
 * Used by automation systems, email tracking, and workflow engines.
 *
 * @module lib/services/activity
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type ActivityType =
  | 'CONTACT_ATTEMPTED'
  | 'CONTACT_MADE'
  | 'EMAIL_SENT'
  | 'EMAIL_OPENED'
  | 'EMAIL_CLICKED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'FORM_VIEWED'
  | 'DOCUMENT_UPLOADED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'CONVERTED'
  | 'ASSIGNED';

// Re-export ActivityType for consumers
export { ActivityType };

interface LeadActivity {
  id: string;
  leadId: string;
  activityType: ActivityType;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdByName?: string | null;
  automated: boolean;
  createdAt: string;
}

export interface CreateActivityParams {
  leadId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
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
 *   activityType: 'EMAIL_SENT',
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

    if (!lead) {
      logger.error(`Cannot create activity: Lead ${leadId} not found`);
      return { success: false, error: 'Lead not found' };
    }

    // If createdBy is provided but no name, fetch it
    let finalCreatedByName = createdByName;
    if (createdBy && !createdByName) {
      const { data: profiles } = await db
        .from('profiles')
        .select('firstName, lastName')
        .eq('id', createdBy)
        .limit(1);

      const profile = firstOrNull(profiles);

      if (profile) {
        finalCreatedByName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
      }
    }

    // Create activity
    const { data: activity, error } = await db
      .from('lead_activities')
      .insert({
        leadId,
        activityType,
        title: title.trim(),
        description: description?.trim() || null,
        metadata: metadata || null,
        createdBy: createdBy || null,
        createdByName: finalCreatedByName || (automated ? 'System' : 'Unknown'),
        automated,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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
    activityType: 'CONTACT_ATTEMPTED',
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
    activityType: 'CONTACT_MADE',
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
    activityType: 'EMAIL_SENT',
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
  // Update lead email opens counter using raw SQL increment
  const { data: currentLead } = await db
    .from('tax_intake_leads')
    .select('emailOpens')
    .eq('id', leadId)
    .single();

  await db
    .from('tax_intake_leads')
    .update({ emailOpens: (currentLead?.emailOpens || 0) + 1 })
    .eq('id', leadId);

  return createActivity({
    leadId,
    activityType: 'EMAIL_OPENED',
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
  const { data: currentLead } = await db
    .from('tax_intake_leads')
    .select('emailClicks')
    .eq('id', leadId)
    .single();

  await db
    .from('tax_intake_leads')
    .update({ emailClicks: (currentLead?.emailClicks || 0) + 1 })
    .eq('id', leadId);

  return createActivity({
    leadId,
    activityType: 'EMAIL_CLICKED',
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
    activityType: 'STATUS_CHANGED',
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
    activityType: 'NOTE_ADDED',
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
    activityType: 'TASK_CREATED',
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
    activityType: 'TASK_COMPLETED',
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
  await db
    .from('tax_intake_leads')
    .update({ lastViewedAt: new Date().toISOString() })
    .eq('id', leadId);

  return createActivity({
    leadId,
    activityType: 'FORM_VIEWED',
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
    activityType: 'DOCUMENT_UPLOADED',
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
    activityType: 'MEETING_SCHEDULED',
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
    activityType: 'MEETING_COMPLETED',
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
    activityType: 'CONVERTED',
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
    activityType: 'ASSIGNED',
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
  // Supabase doesn't support groupBy directly, so we'll get all and aggregate
  const { data: activities } = await db
    .from('lead_activities')
    .select('activityType')
    .eq('leadId', leadId);

  const stats: Record<string, number> = {};
  if (activities) {
    activities.forEach((activity: { activityType: string }) => {
      const type = activity.activityType;
      stats[type] = (stats[type] || 0) + 1;
    });
  }

  return stats;
}

/**
 * Get recent activities across all leads (for dashboard)
 */
export async function getRecentActivities(preparerId?: string, limit: number = 10) {
  let query = db
    .from('lead_activities')
    .select(`
      *,
      lead:tax_intake_leads!leadId (
        id,
        first_name,
        last_name
      )
    `)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (preparerId) {
    // Filter by leads assigned to this preparer
    // This requires a subquery approach in Supabase
    const { data: preparerLeads } = await db
      .from('tax_intake_leads')
      .select('id')
      .eq('assignedTo', preparerId);

    if (preparerLeads && preparerLeads.length > 0) {
      const leadIds = preparerLeads.map((l: { id: string }) => l.id);
      query = query.in('leadId', leadIds);
    } else {
      // No leads assigned, return empty array
      return [];
    }
  }

  const { data: activities } = await query;

  return activities || [];
}
