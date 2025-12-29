/**
 * Accountability Service
 *
 * Tracks missed follow-ups, appointment requests, and preparer accountability
 * Critical for ensuring no client is ignored and maintaining service quality
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type FollowUpMethod = 'CALL' | 'EMAIL' | 'TEXT' | 'VIDEO' | 'IN_PERSON' | 'OTHER';

interface LeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  assignedPreparerId?: string | null;
  contactRequested?: boolean | null;
  contactMethod?: string | null;
  contactNotes?: string | null;
  lastContactedAt?: string | null;
  status?: string | null;
  createdAt: string;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  assignedPreparerId?: string | null;
  contactRequested?: boolean | null;
  contactMethod?: string | null;
  contactNotes?: string | null;
  lastContactedAt?: string | null;
  created_at: string;
}

interface AppointmentRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  preparerId: string;
  status: string;
  requestedAt: string;
}

interface ProfileRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  updatedAt?: string | null;
}

export interface MissedFollowUpAlert {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  preparerId: string;
  preparerName: string;
  contactMethod: string;
  daysWaiting: number;
  requestedAt: Date;
  source: 'Lead' | 'TaxIntake' | 'Appointment';
  urgency: 'critical' | 'high' | 'medium';
}

export interface PreparerAccountability {
  preparerId: string;
  preparerName: string;
  missedFollowUps: number;
  avgResponseTime: number; // hours
  pendingAppointments: number;
  lastActive: Date | null;
  performanceScore: number; // 0-100
}

export interface PlatformAccountabilityStats {
  totalMissedFollowUps: number;
  criticalAlerts: number; // >48 hours
  averageResponseTime: number;
  preparersWithIssues: number;
  totalPendingAppointments: number;
}

/**
 * Get all missed follow-ups platform-wide
 * This is the CRITICAL accountability dashboard for admins
 */
export async function getAllMissedFollowUps(limit?: number): Promise<MissedFollowUpAlert[]> {
  try {
    const now = new Date();
    const results: MissedFollowUpAlert[] = [];

    // Get all leads that need follow-up
    let leadsQuery = db
      .from('leads')
      .select('*')
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null)
      .order('createdAt', { ascending: true });

    if (limit) {
      leadsQuery = leadsQuery.limit(limit);
    }

    const { data: leadsData } = await leadsQuery;
    const leads = (leadsData || []) as LeadRecord[];

    // Get preparer details for leads
    const preparerIds = [
      ...new Set(leads.map((l) => l.assignedPreparerId).filter(Boolean)),
    ] as string[];

    const preparerMap = new Map<string, string>();
    if (preparerIds.length > 0) {
      const { data: preparersData } = await db
        .from('profiles')
        .select('id, firstName, lastName')
        .in('id', preparerIds);

      for (const p of (preparersData || []) as ProfileRecord[]) {
        preparerMap.set(p.id, `${p.firstName || ''} ${p.lastName || ''}`.trim());
      }
    }

    leads.forEach((lead) => {
      if (!lead.assignedPreparerId) return;

      const daysWaiting = Math.floor(
        (now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency: 'critical' | 'high' | 'medium' =
        daysWaiting > 2 ? 'critical' : daysWaiting > 1 ? 'high' : 'medium';

      results.push({
        id: lead.id,
        clientId: lead.id,
        clientName: `${lead.firstName} ${lead.lastName}`,
        clientEmail: lead.email,
        clientPhone: lead.phone,
        preparerId: lead.assignedPreparerId,
        preparerName: preparerMap.get(lead.assignedPreparerId) || 'Unknown',
        contactMethod: lead.contactMethod || 'CALL',
        daysWaiting,
        requestedAt: new Date(lead.createdAt),
        source: 'Lead',
        urgency,
      });
    });

    // Get tax intakes that need follow-up
    let intakesQuery = db
      .from('tax_intake_leads')
      .select('*')
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null)
      .order('created_at', { ascending: true });

    if (limit) {
      intakesQuery = intakesQuery.limit(limit);
    }

    const { data: intakesData } = await intakesQuery;
    const intakes = (intakesData || []) as TaxIntakeLeadRecord[];

    intakes.forEach((intake) => {
      if (!intake.assignedPreparerId) return;

      const daysWaiting = Math.floor(
        (now.getTime() - new Date(intake.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency: 'critical' | 'high' | 'medium' =
        daysWaiting > 2 ? 'critical' : daysWaiting > 1 ? 'high' : 'medium';

      results.push({
        id: intake.id,
        clientId: intake.id,
        clientName: `${intake.first_name} ${intake.last_name}`,
        clientEmail: intake.email,
        clientPhone: intake.phone,
        preparerId: intake.assignedPreparerId,
        preparerName: preparerMap.get(intake.assignedPreparerId) || 'Unknown',
        contactMethod: intake.contactMethod || 'CALL',
        daysWaiting,
        requestedAt: new Date(intake.created_at),
        source: 'TaxIntake',
        urgency,
      });
    });

    // Get appointment requests not yet scheduled
    let appointmentsQuery = db
      .from('appointments')
      .select('*')
      .eq('status', 'REQUESTED')
      .order('requestedAt', { ascending: true });

    if (limit) {
      appointmentsQuery = appointmentsQuery.limit(limit);
    }

    const { data: appointmentsData } = await appointmentsQuery;
    const appointments = (appointmentsData || []) as AppointmentRecord[];

    appointments.forEach((appt) => {
      const daysWaiting = Math.floor(
        (now.getTime() - new Date(appt.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency: 'critical' | 'high' | 'medium' =
        daysWaiting > 2 ? 'critical' : daysWaiting > 1 ? 'high' : 'medium';

      results.push({
        id: appt.id,
        clientId: appt.clientId,
        clientName: appt.clientName,
        clientEmail: appt.clientEmail,
        clientPhone: appt.clientPhone,
        preparerId: appt.preparerId,
        preparerName: preparerMap.get(appt.preparerId) || 'Unknown',
        contactMethod: 'APPOINTMENT',
        daysWaiting,
        requestedAt: new Date(appt.requestedAt),
        source: 'Appointment',
        urgency,
      });
    });

    // Sort by urgency and days waiting
    results.sort((a, b) => {
      if (a.urgency !== b.urgency) {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.daysWaiting - a.daysWaiting;
    });

    return limit ? results.slice(0, limit) : results;
  } catch (error) {
    logger.error('Error fetching all missed follow-ups:', error);
    return [];
  }
}

/**
 * Get preparer accountability metrics
 * Shows which preparers have issues
 */
export async function getPreparerAccountabilityMetrics(): Promise<PreparerAccountability[]> {
  try {
    const { data: preparersData } = await db
      .from('profiles')
      .select('id, firstName, lastName, updatedAt')
      .eq('role', 'TAX_PREPARER');

    const preparers = (preparersData || []) as ProfileRecord[];

    const now = new Date();
    const metrics: PreparerAccountability[] = [];

    for (const preparer of preparers) {
      // Count missed follow-ups (leads)
      const { count: missedLeads } = await db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('assignedPreparerId', preparer.id)
        .eq('contactRequested', true)
        .is('lastContactedAt', null);

      // Count missed follow-ups (intakes)
      const { count: missedIntakes } = await db
        .from('tax_intake_leads')
        .select('id', { count: 'exact', head: true })
        .eq('assignedPreparerId', preparer.id)
        .eq('contactRequested', true)
        .is('lastContactedAt', null);

      const missedFollowUps = (missedLeads || 0) + (missedIntakes || 0);

      // Calculate average response time
      const { data: leadsData } = await db
        .from('leads')
        .select('createdAt, lastContactedAt')
        .eq('assignedPreparerId', preparer.id)
        .not('lastContactedAt', 'is', null)
        .limit(20);

      const leads = (leadsData || []) as { createdAt: string; lastContactedAt?: string | null }[];

      let avgResponseTime = 0;
      if (leads.length > 0) {
        const totalHours = leads.reduce((sum, lead) => {
          if (!lead.lastContactedAt) return sum;
          const diff =
            new Date(lead.lastContactedAt).getTime() - new Date(lead.createdAt).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgResponseTime = Math.round(totalHours / leads.length);
      }

      // Count pending appointments
      const { count: pendingAppointments } = await db
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('preparerId', preparer.id)
        .eq('status', 'REQUESTED');

      // Calculate performance score (0-100)
      // Lower missed follow-ups = better score
      // Faster response time = better score
      // Fewer pending appointments = better score
      let score = 100;
      score -= missedFollowUps * 10; // -10 points per missed follow-up
      score -= Math.min(avgResponseTime, 48); // -1 point per hour response time, max -48
      score -= (pendingAppointments || 0) * 5; // -5 points per pending appointment
      score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

      metrics.push({
        preparerId: preparer.id,
        preparerName: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || 'Unknown',
        missedFollowUps,
        avgResponseTime,
        pendingAppointments: pendingAppointments || 0,
        lastActive: preparer.updatedAt ? new Date(preparer.updatedAt) : null,
        performanceScore: score,
      });
    }

    // Sort by performance score (worst first)
    metrics.sort((a, b) => a.performanceScore - b.performanceScore);

    return metrics;
  } catch (error) {
    logger.error('Error fetching preparer accountability metrics:', error);
    return [];
  }
}

/**
 * Get platform-wide accountability statistics
 * Used for admin dashboard overview
 */
export async function getPlatformAccountabilityStats(): Promise<PlatformAccountabilityStats> {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Total missed follow-ups (leads)
    const { count: missedLeads } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null);

    // Total missed follow-ups (intakes)
    const { count: missedIntakes } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null);

    const totalMissedFollowUps = (missedLeads || 0) + (missedIntakes || 0);

    // Critical alerts (>48 hours old) - leads
    const { count: criticalLeads } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null)
      .lt('createdAt', twoDaysAgo.toISOString());

    // Critical alerts (>48 hours old) - intakes
    const { count: criticalIntakes } = await db
      .from('tax_intake_leads')
      .select('id', { count: 'exact', head: true })
      .eq('contactRequested', true)
      .is('lastContactedAt', null)
      .not('assignedPreparerId', 'is', null)
      .lt('created_at', twoDaysAgo.toISOString());

    const criticalAlerts = (criticalLeads || 0) + (criticalIntakes || 0);

    // Calculate platform average response time
    const { data: recentContactsData } = await db
      .from('leads')
      .select('createdAt, lastContactedAt')
      .not('lastContactedAt', 'is', null)
      .order('lastContactedAt', { ascending: false })
      .limit(100);

    const recentContacts = (recentContactsData || []) as {
      createdAt: string;
      lastContactedAt?: string | null;
    }[];

    let averageResponseTime = 0;
    if (recentContacts.length > 0) {
      const totalHours = recentContacts.reduce((sum, contact) => {
        if (!contact.lastContactedAt) return sum;
        const diff =
          new Date(contact.lastContactedAt).getTime() - new Date(contact.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      averageResponseTime = Math.round(totalHours / recentContacts.length);
    }

    // Count preparers with issues (score < 50)
    const allMetrics = await getPreparerAccountabilityMetrics();
    const preparersWithIssues = allMetrics.filter((m) => m.performanceScore < 50).length;

    // Total pending appointments
    const { count: totalPendingAppointments } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'REQUESTED');

    return {
      totalMissedFollowUps,
      criticalAlerts,
      averageResponseTime,
      preparersWithIssues,
      totalPendingAppointments: totalPendingAppointments || 0,
    };
  } catch (error) {
    logger.error('Error fetching platform accountability stats:', error);
    return {
      totalMissedFollowUps: 0,
      criticalAlerts: 0,
      averageResponseTime: 0,
      preparersWithIssues: 0,
      totalPendingAppointments: 0,
    };
  }
}

/**
 * Get missed follow-ups for a specific preparer
 */
export async function getPreparerMissedFollowUpsList(
  preparerId: string
): Promise<MissedFollowUpAlert[]> {
  try {
    const allMissed = await getAllMissedFollowUps();
    return allMissed.filter((m) => m.preparerId === preparerId);
  } catch (error) {
    logger.error('Error fetching preparer missed follow-ups list:', error);
    return [];
  }
}

/**
 * Mark a follow-up as completed
 * This updates the lastContactedAt timestamp
 */
export async function markFollowUpCompleted(params: {
  source: 'Lead' | 'TaxIntake';
  clientId: string;
  preparerId: string;
  contactMethod: string;
  notes?: string;
}) {
  try {
    const now = new Date().toISOString();

    if (params.source === 'Lead') {
      await db
        .from('leads')
        .update({
          lastContactedAt: now,
          contactNotes: params.notes,
          status: 'CONTACTED',
        })
        .eq('id', params.clientId);
    } else if (params.source === 'TaxIntake') {
      await db
        .from('tax_intake_leads')
        .update({
          lastContactedAt: now,
          contactNotes: params.notes,
        })
        .eq('id', params.clientId);
    }

    // Log the follow-up
    await db.from('follow_up_logs').insert({
      clientId: params.clientId,
      preparerId: params.preparerId,
      method: params.contactMethod as FollowUpMethod,
      outcome: 'CONNECTED',
      notes: params.notes,
      contactedAt: now,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error marking follow-up completed:', error);
    return { success: false, error };
  }
}

/**
 * Escalate a missed follow-up
 * Reassign to another preparer or admin
 */
export async function escalateMissedFollowUp(params: {
  source: 'Lead' | 'TaxIntake';
  clientId: string;
  newPreparerId: string;
  reason: string;
}) {
  try {
    if (params.source === 'Lead') {
      await db
        .from('leads')
        .update({
          assignedPreparerId: params.newPreparerId,
          contactNotes: `ESCALATED: ${params.reason}`,
        })
        .eq('id', params.clientId);
    } else if (params.source === 'TaxIntake') {
      await db
        .from('tax_intake_leads')
        .update({
          assignedPreparerId: params.newPreparerId,
          contactNotes: `ESCALATED: ${params.reason}`,
        })
        .eq('id', params.clientId);
    }

    return { success: true };
  } catch (error) {
    logger.error('Error escalating missed follow-up:', error);
    return { success: false, error };
  }
}
