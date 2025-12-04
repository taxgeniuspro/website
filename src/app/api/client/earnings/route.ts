/**
 * Client Earnings API
 *
 * GET /api/client/earnings
 * Returns comprehensive earnings and referral performance data for the authenticated client
 *
 * Includes:
 * - Total earned, paid out, amount owed
 * - Lead counts and completion rates
 * - Link performance breakdown
 * - Traffic source analysis
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Authenticate user
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({
        totalEarned: 0,
        paidOut: 0,
        amountOwed: 0,
        thisMonth: 0,
        totalLeads: 0,
        completedReturns: 0,
        successRate: 0,
        activeLinks: 0,
        linkPerformance: {
          intakeLink: { clicks: 0, leads: 0, earnings: 0 },
          appointmentLink: { clicks: 0, leads: 0, earnings: 0 },
        },
        trafficSources: [],
      });
    }

    // Get all leads attributed to this user
    const leads = await prisma.lead.findMany({
      where: {
        referrerUsername: profile.shortLinkUsername,
      },
      select: {
        id: true,
        status: true,
        commissionRate: true,
        convertedToClient: true,
        createdAt: true,
        source: true,
      },
    });

    // Calculate earnings
    const totalEarned = leads.reduce((sum, lead) => {
      return sum + (Number(lead.commissionRate) || 0);
    }, 0);

    // Get this month's earnings
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = leads
      .filter((lead) => lead.createdAt >= firstDayOfMonth)
      .reduce((sum, lead) => {
        return sum + (Number(lead.commissionRate) || 0);
      }, 0);

    // Count completed returns (status = COMPLETED or converted)
    const completedReturns = leads.filter(
      (lead) => lead.status === 'COMPLETED' || lead.convertedToClient
    ).length;

    // Calculate success rate
    const successRate = leads.length > 0 ? (completedReturns / leads.length) * 100 : 0;

    // For now, paidOut and amountOwed are placeholders
    // These would need to be tracked in a separate payouts table
    const paidOut = 0; // TODO: Sum from payouts table
    const amountOwed = totalEarned - paidOut;

    // Get link performance
    const shortLinks = await prisma.shortLink.findMany({
      where: {
        OR: [
          { shortCode: { endsWith: `-${profile.shortLinkUsername}-intake` } },
          { shortCode: { endsWith: `-${profile.shortLinkUsername}-appt` } },
        ],
      },
      select: {
        id: true,
        shortCode: true,
        clicks: true,
        leads: true,
      },
    });

    const intakeLink = shortLinks.find((link) => link.shortCode.endsWith('-intake'));
    const appointmentLink = shortLinks.find((link) => link.shortCode.endsWith('-appt'));

    // Calculate earnings per link based on lead source
    const intakeLeads = leads.filter((lead) => {
      return lead.source?.includes('start-filing') || lead.source?.includes('intake');
    });
    const appointmentLeads = leads.filter((lead) => {
      return lead.source?.includes('book') || lead.source?.includes('appointment');
    });

    const intakeEarnings = intakeLeads.reduce(
      (sum, lead) => sum + (Number(lead.commissionRate) || 0),
      0
    );
    const appointmentEarnings = appointmentLeads.reduce(
      (sum, lead) => sum + (Number(lead.commissionRate) || 0),
      0
    );

    // Analyze traffic sources
    const sourceCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      if (lead.source) {
        // Extract domain or source name
        let sourceName = 'Direct';
        try {
          const url = new URL(lead.source);
          sourceName = url.hostname.replace('www.', '');
        } catch {
          // If not a URL, use as-is
          sourceName = lead.source;
        }

        sourceCounts[sourceName] = (sourceCounts[sourceName] || 0) + 1;
      }
    });

    // Convert to array and sort by count
    const trafficSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        clicks: count,
        percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5); // Top 5 sources

    return NextResponse.json({
      totalEarned: Number(totalEarned.toFixed(2)),
      paidOut: Number(paidOut.toFixed(2)),
      amountOwed: Number(amountOwed.toFixed(2)),
      thisMonth: Number(thisMonth.toFixed(2)),
      totalLeads: leads.length,
      completedReturns,
      successRate: Number(successRate.toFixed(1)),
      activeLinks: shortLinks.length,
      linkPerformance: {
        intakeLink: {
          clicks: intakeLink?.clicks || 0,
          leads: intakeLeads.length,
          earnings: Number(intakeEarnings.toFixed(2)),
        },
        appointmentLink: {
          clicks: appointmentLink?.clicks || 0,
          leads: appointmentLeads.length,
          earnings: Number(appointmentEarnings.toFixed(2)),
        },
      },
      trafficSources,
    });
  } catch (error) {
    logger.error('Error fetching client earnings', { error });
    return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
  }
}
