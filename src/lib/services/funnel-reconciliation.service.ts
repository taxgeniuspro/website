/**
 * Funnel Reconciliation Service
 *
 * Synchronizes cached MarketingLink counters with actual Lead/TaxIntakeLead counts.
 * This prevents data drift between cached analytics and actual database records.
 */

import { prisma } from '@/lib/prisma';

interface ReconciliationResult {
  linkId: string;
  linkCode: string;
  creatorUsername: string;
  before: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversions: number;
  };
  after: {
    clicks: number;
    intakeStarts: number;
    intakeCompletes: number;
    returnsFiled: number;
    conversions: number;
  };
  updated: boolean;
}

interface ReconciliationSummary {
  totalLinks: number;
  linksUpdated: number;
  linksSkipped: number;
  errors: string[];
  results: ReconciliationResult[];
}

/**
 * Get the creator's shortLinkUsername from their profile
 */
async function getCreatorUsername(creatorId: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: creatorId },
    select: { shortLinkUsername: true },
  });
  return profile?.shortLinkUsername ?? null;
}

/**
 * Count actual funnel metrics for a referrer username
 */
async function countActualMetrics(referrerUsername: string, creatorId: string) {
  // Count clicks from LinkClick records linked to any MarketingLink for this creator
  const links = await prisma.marketingLink.findMany({
    where: { creatorId },
    select: { id: true },
  });
  const linkIds = links.map((l) => l.id);

  const clicksCount = linkIds.length > 0
    ? await prisma.linkClick.count({
        where: { linkId: { in: linkIds } },
      })
    : 0;

  // Count intake starts (TaxIntakeLead records, not completed)
  const intakeStartsCount = await prisma.taxIntakeLead.count({
    where: { referrerUsername },
  });

  // Count intake completes (TaxIntakeLead records where completed=true)
  const intakeCompletesCount = await prisma.taxIntakeLead.count({
    where: { referrerUsername, completed: true },
  });

  // Count returns filed (Leads that are CONVERTED or have associated TaxReturn)
  const returnsFiledCount = await prisma.lead.count({
    where: {
      referrerUsername,
      status: 'CONVERTED',
    },
  });

  // Conversions = intake completes (form submissions)
  const conversionsCount = intakeCompletesCount;

  return {
    clicks: clicksCount,
    intakeStarts: intakeStartsCount,
    intakeCompletes: intakeCompletesCount,
    returnsFiled: returnsFiledCount,
    conversions: conversionsCount,
  };
}

/**
 * Reconcile a single MarketingLink's cached counters with actual data
 */
async function reconcileLink(linkId: string): Promise<ReconciliationResult | null> {
  const link = await prisma.marketingLink.findUnique({
    where: { id: linkId },
  });

  if (!link) {
    return null;
  }

  // Look up the creator's profile to get their shortLinkUsername
  const creatorUsername = await getCreatorUsername(link.creatorId);
  if (!creatorUsername) {
    return null;
  }

  const before = {
    clicks: link.clicks,
    intakeStarts: link.intakeStarts,
    intakeCompletes: link.intakeCompletes,
    returnsFiled: link.returnsFiled,
    conversions: link.conversions,
  };

  const actual = await countActualMetrics(creatorUsername, link.creatorId);

  // Check if any values differ
  const needsUpdate =
    before.clicks !== actual.clicks ||
    before.intakeStarts !== actual.intakeStarts ||
    before.intakeCompletes !== actual.intakeCompletes ||
    before.returnsFiled !== actual.returnsFiled ||
    before.conversions !== actual.conversions;

  if (needsUpdate) {
    // Calculate conversion rates
    const intakeConversionRate = actual.clicks > 0 ? (actual.intakeStarts / actual.clicks) * 100 : 0;
    const completeConversionRate = actual.clicks > 0 ? (actual.intakeCompletes / actual.clicks) * 100 : 0;
    const filedConversionRate = actual.clicks > 0 ? (actual.returnsFiled / actual.clicks) * 100 : 0;
    const conversionRate = actual.clicks > 0 ? (actual.conversions / actual.clicks) * 100 : 0;

    await prisma.marketingLink.update({
      where: { id: linkId },
      data: {
        clicks: actual.clicks,
        uniqueClicks: actual.clicks, // Assuming unique for simplicity
        intakeStarts: actual.intakeStarts,
        intakeCompletes: actual.intakeCompletes,
        returnsFiled: actual.returnsFiled,
        conversions: actual.conversions,
        intakeConversionRate,
        completeConversionRate,
        filedConversionRate,
        conversionRate,
      },
    });
  }

  return {
    linkId,
    linkCode: link.code,
    creatorUsername,
    before,
    after: actual,
    updated: needsUpdate,
  };
}

/**
 * Reconcile all active MarketingLinks or a specific link
 */
export async function reconcileFunnelData(linkId?: string): Promise<ReconciliationSummary> {
  const summary: ReconciliationSummary = {
    totalLinks: 0,
    linksUpdated: 0,
    linksSkipped: 0,
    errors: [],
    results: [],
  };

  try {
    if (linkId) {
      // Reconcile single link
      const result = await reconcileLink(linkId);
      if (result) {
        summary.totalLinks = 1;
        summary.results.push(result);
        if (result.updated) {
          summary.linksUpdated = 1;
        } else {
          summary.linksSkipped = 1;
        }
      } else {
        summary.errors.push(`Link not found: ${linkId}`);
      }
    } else {
      // Reconcile all active links
      const links = await prisma.marketingLink.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      summary.totalLinks = links.length;

      for (const link of links) {
        try {
          const result = await reconcileLink(link.id);
          if (result) {
            summary.results.push(result);
            if (result.updated) {
              summary.linksUpdated++;
            } else {
              summary.linksSkipped++;
            }
          }
        } catch (error) {
          summary.errors.push(`Error reconciling link ${link.id}: ${error}`);
        }
      }
    }
  } catch (error) {
    summary.errors.push(`Fatal error during reconciliation: ${error}`);
  }

  return summary;
}

/**
 * Check if any links have drifted counters (without updating)
 */
export async function checkFunnelDrift(): Promise<{
  hasDrift: boolean;
  driftedLinks: string[];
}> {
  const links = await prisma.marketingLink.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      creatorId: true,
      clicks: true,
      intakeStarts: true,
      intakeCompletes: true,
      returnsFiled: true,
      conversions: true,
    },
  });

  const driftedLinks: string[] = [];

  for (const link of links) {
    const creatorUsername = await getCreatorUsername(link.creatorId);
    if (!creatorUsername) continue;

    const actual = await countActualMetrics(creatorUsername, link.creatorId);

    const hasDrift =
      link.clicks !== actual.clicks ||
      link.intakeStarts !== actual.intakeStarts ||
      link.intakeCompletes !== actual.intakeCompletes ||
      link.returnsFiled !== actual.returnsFiled ||
      link.conversions !== actual.conversions;

    if (hasDrift) {
      driftedLinks.push(link.code);
    }
  }

  return {
    hasDrift: driftedLinks.length > 0,
    driftedLinks,
  };
}
