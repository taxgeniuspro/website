/**
 * Accountability Service
 *
 * Tracks missed follow-ups, appointment requests, and preparer accountability
 * Critical for ensuring no client is ignored and maintaining service quality
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FollowUpMethod } from '@prisma/client';

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
    const leads = await prisma.lead.findMany({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
      },
      include: {
        // This will need a relation added to schema, but for now we'll fetch preparer separately
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
      take: limit,
    });

    // Get preparer details for leads
    const preparerIds = [
      ...new Set(leads.map((l) => l.assignedPreparerId).filter(Boolean)),
    ] as string[];
    const preparers = await prisma.profile.findMany({
      where: { id: { in: preparerIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const preparerMap = new Map(
      preparers.map((p) => [p.id, `${p.firstName || ''} ${p.lastName || ''}`.trim()])
    );

    leads.forEach((lead) => {
      if (!lead.assignedPreparerId) return;

      const daysWaiting = Math.floor(
        (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
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
        requestedAt: lead.createdAt,
        source: 'Lead',
        urgency,
      });
    });

    // Get tax intakes that need follow-up
    const intakes = await prisma.taxIntakeLead.findMany({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
      },
      orderBy: { created_at: 'asc' },
      take: limit,
    });

    intakes.forEach((intake) => {
      if (!intake.assignedPreparerId) return;

      const daysWaiting = Math.floor(
        (now.getTime() - intake.created_at.getTime()) / (1000 * 60 * 60 * 24)
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
        requestedAt: intake.created_at,
        source: 'TaxIntake',
        urgency,
      });
    });

    // Get appointment requests not yet scheduled
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'REQUESTED',
      },
      orderBy: { requestedAt: 'asc' },
      take: limit,
    });

    appointments.forEach((appt) => {
      const daysWaiting = Math.floor(
        (now.getTime() - appt.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
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
        requestedAt: appt.requestedAt,
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
    const preparers = await prisma.profile.findMany({
      where: { role: 'TAX_PREPARER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    const now = new Date();
    const metrics: PreparerAccountability[] = [];

    for (const preparer of preparers) {
      // Count missed follow-ups
      const missedLeads = await prisma.lead.count({
        where: {
          assignedPreparerId: preparer.id,
          contactRequested: true,
          lastContactedAt: null,
        },
      });

      const missedIntakes = await prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: preparer.id,
          contactRequested: true,
          lastContactedAt: null,
        },
      });

      const missedFollowUps = missedLeads + missedIntakes;

      // Calculate average response time
      const leads = await prisma.lead.findMany({
        where: {
          assignedPreparerId: preparer.id,
          lastContactedAt: { not: null },
        },
        select: {
          createdAt: true,
          lastContactedAt: true,
        },
        take: 20, // Last 20 contacts
      });

      let avgResponseTime = 0;
      if (leads.length > 0) {
        const totalHours = leads.reduce((sum, lead) => {
          if (!lead.lastContactedAt) return sum;
          const diff = lead.lastContactedAt.getTime() - lead.createdAt.getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgResponseTime = Math.round(totalHours / leads.length);
      }

      // Count pending appointments
      const pendingAppointments = await prisma.appointment.count({
        where: {
          preparerId: preparer.id,
          status: 'REQUESTED',
        },
      });

      // Calculate performance score (0-100)
      // Lower missed follow-ups = better score
      // Faster response time = better score
      // Fewer pending appointments = better score
      let score = 100;
      score -= missedFollowUps * 10; // -10 points per missed follow-up
      score -= Math.min(avgResponseTime, 48); // -1 point per hour response time, max -48
      score -= pendingAppointments * 5; // -5 points per pending appointment
      score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

      metrics.push({
        preparerId: preparer.id,
        preparerName: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() || 'Unknown',
        missedFollowUps,
        avgResponseTime,
        pendingAppointments,
        lastActive: preparer.updatedAt,
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

    // Total missed follow-ups
    const missedLeads = await prisma.lead.count({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
      },
    });

    const missedIntakes = await prisma.taxIntakeLead.count({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
      },
    });

    const totalMissedFollowUps = missedLeads + missedIntakes;

    // Critical alerts (>48 hours old)
    const criticalLeads = await prisma.lead.count({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
        createdAt: { lt: twoDaysAgo },
      },
    });

    const criticalIntakes = await prisma.taxIntakeLead.count({
      where: {
        contactRequested: true,
        lastContactedAt: null,
        assignedPreparerId: { not: null },
        created_at: { lt: twoDaysAgo },
      },
    });

    const criticalAlerts = criticalLeads + criticalIntakes;

    // Calculate platform average response time
    const recentContacts = await prisma.lead.findMany({
      where: {
        lastContactedAt: { not: null },
      },
      select: {
        createdAt: true,
        lastContactedAt: true,
      },
      take: 100, // Last 100 contacts
      orderBy: { lastContactedAt: 'desc' },
    });

    let averageResponseTime = 0;
    if (recentContacts.length > 0) {
      const totalHours = recentContacts.reduce((sum, contact) => {
        if (!contact.lastContactedAt) return sum;
        const diff = contact.lastContactedAt.getTime() - contact.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      averageResponseTime = Math.round(totalHours / recentContacts.length);
    }

    // Count preparers with issues (score < 50)
    const allMetrics = await getPreparerAccountabilityMetrics();
    const preparersWithIssues = allMetrics.filter((m) => m.performanceScore < 50).length;

    // Total pending appointments
    const totalPendingAppointments = await prisma.appointment.count({
      where: { status: 'REQUESTED' },
    });

    return {
      totalMissedFollowUps,
      criticalAlerts,
      averageResponseTime,
      preparersWithIssues,
      totalPendingAppointments,
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
    const now = new Date();

    if (params.source === 'Lead') {
      await prisma.lead.update({
        where: { id: params.clientId },
        data: {
          lastContactedAt: now,
          contactNotes: params.notes,
          status: 'CONTACTED',
        },
      });
    } else if (params.source === 'TaxIntake') {
      await prisma.taxIntakeLead.update({
        where: { id: params.clientId },
        data: {
          lastContactedAt: now,
          contactNotes: params.notes,
        },
      });
    }

    // Log the follow-up
    await prisma.followUpLog.create({
      data: {
        clientId: params.clientId,
        preparerId: params.preparerId,
        method: params.contactMethod as FollowUpMethod,
        outcome: 'CONNECTED',
        notes: params.notes,
        contactedAt: now,
      },
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
      await prisma.lead.update({
        where: { id: params.clientId },
        data: {
          assignedPreparerId: params.newPreparerId,
          contactNotes: `ESCALATED: ${params.reason}`,
        },
      });
    } else if (params.source === 'TaxIntake') {
      await prisma.taxIntakeLead.update({
        where: { id: params.clientId },
        data: {
          assignedPreparerId: params.newPreparerId,
          contactNotes: `ESCALATED: ${params.reason}`,
        },
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error escalating missed follow-up:', error);
    return { success: false, error };
  }
}
