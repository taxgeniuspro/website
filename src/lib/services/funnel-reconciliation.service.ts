/**
 * Funnel Reconciliation Service
 *
 * Synchronizes cached MarketingLink counters with actual Lead/TaxIntakeLead counts.
 * This prevents data drift between cached analytics and actual database records.
 */

import { db, firstOrNull } from '@/lib/db';

// Local type definitions
interface MarketingLinkRecord {
  id: string;
  code: string;
  creatorId: string;
  clicks: number;
  uniqueClicks: number;
  intakeStarts: number;
  intakeCompletes: number;
  returnsFiled: number;
  conversions: number;
  returns?: number;
  intakeConversionRate: number;
  completeConversionRate: number;
  filedConversionRate: number;
  conversionRate: number;
  isActive: boolean;
}

interface ProfileRecord {
  id: string;
  shortLinkUsername?: string | null;
}

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
  const { data: profileData } = await db
    .from('profiles')
    .select('shortLinkUsername')
    .eq('id', creatorId)
    .limit(1);

  const profile = firstOrNull(profileData) as ProfileRecord | null;
  return profile?.shortLinkUsername ?? null;
}

/**
 * Count actual funnel metrics for a referrer username
 */
async function countActualMetrics(referrerUsername: string, creatorId: string) {
  // Count clicks from LinkClick records linked to any MarketingLink for this creator
  const { data: linksData } = await db
    .from('marketing_links')
    .select('id')
    .eq('creatorId', creatorId);

  const linkIds = (linksData || []).map((l: { id: string }) => l.id);

  let clicksCount = 0;
  if (linkIds.length > 0) {
    const { count } = await db
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('linkId', linkIds);
    clicksCount = count || 0;
  }

  // Count intake starts (TaxIntakeLead records, not completed)
  const { count: intakeStartsCount } = await db
    .from('tax_intake_leads')
    .select('id', { count: 'exact', head: true })
    .eq('referrerUsername', referrerUsername);

  // Count intake completes (TaxIntakeLead records where completed=true)
  const { count: intakeCompletesCount } = await db
    .from('tax_intake_leads')
    .select('id', { count: 'exact', head: true })
    .eq('referrerUsername', referrerUsername)
    .eq('completed', true);

  // Count returns filed (Leads that are CONVERTED or have associated TaxReturn)
  const { count: returnsFiledCount } = await db
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('referrerUsername', referrerUsername)
    .eq('status', 'CONVERTED');

  // Conversions = intake completes (form submissions)
  const conversionsCount = intakeCompletesCount || 0;

  return {
    clicks: clicksCount,
    intakeStarts: intakeStartsCount || 0,
    intakeCompletes: intakeCompletesCount || 0,
    returnsFiled: returnsFiledCount || 0,
    conversions: conversionsCount,
  };
}

/**
 * Reconcile a single MarketingLink's cached counters with actual data
 */
async function reconcileLink(linkId: string): Promise<ReconciliationResult | null> {
  const { data: linkData } = await db
    .from('marketing_links')
    .select('*')
    .eq('id', linkId)
    .limit(1);

  const link = firstOrNull(linkData) as MarketingLinkRecord | null;

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

    await db
      .from('marketing_links')
      .update({
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
      })
      .eq('id', linkId);
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
      const { data: linksData } = await db
        .from('marketing_links')
        .select('id')
        .eq('isActive', true);

      const links = (linksData || []) as { id: string }[];
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
  const { data: linksData } = await db
    .from('marketing_links')
    .select('id, code, creatorId, clicks, intakeStarts, intakeCompletes, returnsFiled, conversions')
    .eq('isActive', true);

  const links = (linksData || []) as MarketingLinkRecord[];
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
