/**
 * Journey Tracking Service
 *
 * Tracks customer journey through 4 stages:
 * 1. CLICKED - User arrives via marketing link
 * 2. INTAKE_STARTED - User begins tax intake form
 * 3. INTAKE_COMPLETED - User submits intake form
 * 4. RETURN_FILED - Tax return is filed
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement
 */

import { db, firstOrNull } from '@/lib/db';
import type { UTMAttribution } from './utm-tracking.service';
import { logger } from '@/lib/logger';

export type JourneyStage = 'CLICKED' | 'INTAKE_STARTED' | 'INTAKE_COMPLETED' | 'RETURN_FILED';

// Local type definitions (replacing @prisma/client)
interface LinkClickRecord {
  id: string;
  linkId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  clickedAt: string;
  converted?: boolean;
  clientId?: string | null;
  intakeStartedAt?: string | null;
  intakeCompletedAt?: string | null;
  taxReturnCompletedAt?: string | null;
}

interface MarketingLinkRecord {
  id: string;
  linkType: string;
  creatorId: string;
  clicks: number;
  intakeStarts?: number;
  intakeCompletes?: number;
  returnsFiled?: number;
  returns?: number;
  conversions?: number;
  intakeConversionRate?: number;
  completeConversionRate?: number;
  filedConversionRate?: number;
}

// Extended LinkClick with journey tracking metadata
type LinkClickWithJourney = LinkClickRecord & {
  intakeStartedAt?: string | null;
  intakeCompletedAt?: string | null;
  taxReturnCompletedAt?: string | null;
};

// Extended MarketingLink with aggregate stats
type MarketingLinkWithStats = MarketingLinkRecord & {
  intakeStarts?: number;
  intakeCompletes?: number;
  returnsFiled?: number;
};

export interface TrackJourneyStageParams {
  trackingCode: string;
  stage: JourneyStage;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface JourneyStageResult {
  success: boolean;
  journeyStage: JourneyStage;
  linkClick?: LinkClickRecord;
  attribution?: {
    materialId: string;
    materialType: string;
    creatorId: string;
  };
  error?: string;
}

/**
 * Track a journey stage
 */
export async function trackJourneyStage(
  params: TrackJourneyStageParams
): Promise<JourneyStageResult> {
  const { trackingCode, stage, userId } = params;

  try {
    // Find the link click by tracking code
    const linkClick = await findLinkClickByTrackingCode(trackingCode);

    if (!linkClick) {
      return {
        success: false,
        journeyStage: stage,
        error: 'Link click not found for tracking code',
      };
    }

    // Validate stage progression
    const validationError = validateStageProgression(linkClick, stage);
    if (validationError) {
      return {
        success: false,
        journeyStage: stage,
        error: validationError,
      };
    }

    // Update the link click with the new stage
    const updatedLinkClick = await updateLinkClickStage(linkClick.id, stage, userId);

    // Update cached counters on the marketing link
    await updateMarketingLinkCounters(linkClick.linkId, stage);

    // Get attribution info
    const { data: marketingLinkData } = await db
      .from('marketing_links')
      .select('id, linkType, creatorId')
      .eq('id', linkClick.linkId)
      .limit(1);

    const marketingLink = firstOrNull(marketingLinkData) as MarketingLinkRecord | null;

    return {
      success: true,
      journeyStage: stage,
      linkClick: updatedLinkClick,
      attribution: marketingLink
        ? {
            materialId: marketingLink.id,
            materialType: marketingLink.linkType,
            creatorId: marketingLink.creatorId,
          }
        : undefined,
    };
  } catch (error) {
    logger.error('Failed to track journey stage:', error);
    return {
      success: false,
      journeyStage: stage,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find link click by tracking code
 */
async function findLinkClickByTrackingCode(trackingCode: string): Promise<LinkClickRecord | null> {
  // The tracking code is stored in the UTM cookie, but we need to find the link click
  // We'll store the tracking code in the referrer field temporarily
  // TODO: Add trackingCode field to LinkClick model in next migration

  const { data: clickData } = await db
    .from('link_clicks')
    .select('*')
    .ilike('referrer', `%${trackingCode}%`)
    .order('clickedAt', { ascending: false })
    .limit(1);

  return firstOrNull(clickData) as LinkClickRecord | null;
}

/**
 * Validate stage progression (cannot skip stages)
 */
function validateStageProgression(
  linkClick: LinkClickWithJourney,
  stage: JourneyStage
): string | null {
  const clicked = linkClick.clickedAt;
  const intakeStarted = linkClick.intakeStartedAt;
  const intakeCompleted = linkClick.intakeCompletedAt;
  const returnFiled = linkClick.taxReturnCompletedAt;

  switch (stage) {
    case 'CLICKED':
      // First stage, always valid
      return null;

    case 'INTAKE_STARTED':
      // Must have clicked first
      if (!clicked) {
        return 'Cannot start intake without clicking link first';
      }
      // Cannot start twice
      if (intakeStarted) {
        return 'Intake already started';
      }
      return null;

    case 'INTAKE_COMPLETED':
      // Must have started intake first
      if (!intakeStarted) {
        return 'Cannot complete intake without starting it first';
      }
      // Cannot complete twice
      if (intakeCompleted) {
        return 'Intake already completed';
      }
      return null;

    case 'RETURN_FILED':
      // Must have completed intake first
      if (!intakeCompleted) {
        return 'Cannot file return without completing intake first';
      }
      // Cannot file twice
      if (returnFiled) {
        return 'Return already filed';
      }
      return null;

    default:
      return `Invalid stage: ${stage}`;
  }
}

/**
 * Update link click with journey stage timestamp
 */
async function updateLinkClickStage(
  linkClickId: string,
  stage: JourneyStage,
  userId?: string
): Promise<LinkClickRecord> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {};

  switch (stage) {
    case 'INTAKE_STARTED':
      updateData.intakeStartedAt = now;
      break;
    case 'INTAKE_COMPLETED':
      updateData.intakeCompletedAt = now;
      updateData.converted = true;
      if (userId) {
        updateData.clientId = userId;
      }
      break;
    case 'RETURN_FILED':
      updateData.taxReturnCompletedAt = now;
      break;
  }

  const { data: clickData, error } = await db
    .from('link_clicks')
    .update(updateData)
    .eq('id', linkClickId)
    .select()
    .single();

  if (error) throw error;

  return clickData as LinkClickRecord;
}

/**
 * Update cached counters on marketing link
 */
async function updateMarketingLinkCounters(linkId: string, stage: JourneyStage): Promise<void> {
  // Get current values for increment
  const { data: linkData } = await db
    .from('marketing_links')
    .select('intakeStarts, intakeCompletes, conversions, returnsFiled, returns')
    .eq('id', linkId)
    .limit(1);

  const link = firstOrNull(linkData) as MarketingLinkWithStats | null;
  if (!link) return;

  const updateData: Record<string, number> = {};

  switch (stage) {
    case 'INTAKE_STARTED':
      // Increment intakeStarts counter
      updateData.intakeStarts = (link.intakeStarts || 0) + 1;
      break;
    case 'INTAKE_COMPLETED':
      // Increment intakeCompletes and conversions counters
      updateData.intakeCompletes = (link.intakeCompletes || 0) + 1;
      updateData.conversions = (link.conversions || 0) + 1;
      break;
    case 'RETURN_FILED':
      // Increment returnsFiled counter
      updateData.returnsFiled = (link.returnsFiled || 0) + 1;
      updateData.returns = (link.returns || 0) + 1;
      break;
  }

  if (Object.keys(updateData).length > 0) {
    await db
      .from('marketing_links')
      .update(updateData)
      .eq('id', linkId);

    // Recalculate conversion rates
    await recalculateConversionRates(linkId);
  }
}

/**
 * Recalculate conversion rates for a marketing link
 */
async function recalculateConversionRates(linkId: string): Promise<void> {
  const { data: linkData } = await db
    .from('marketing_links')
    .select('clicks, intakeStarts, intakeCompletes, returnsFiled')
    .eq('id', linkId)
    .limit(1);

  const link = firstOrNull(linkData) as MarketingLinkWithStats | null;
  if (!link) return;

  const clicks = link.clicks || 0;
  const intakeStarts = link.intakeStarts || 0;
  const intakeCompletes = link.intakeCompletes || 0;
  const returnsFiled = link.returnsFiled || 0;

  await db
    .from('marketing_links')
    .update({
      intakeConversionRate: clicks > 0 ? (intakeStarts / clicks) * 100 : 0,
      completeConversionRate: clicks > 0 ? (intakeCompletes / clicks) * 100 : 0,
      filedConversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
    })
    .eq('id', linkId);
}

/**
 * Create initial link click with UTM attribution
 */
export async function createLinkClick(params: {
  linkId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  attribution?: UTMAttribution;
}): Promise<LinkClickRecord> {
  const { linkId, ipAddress, userAgent, referrer, attribution } = params;

  // Store tracking code in referrer field temporarily
  // TODO: Add proper trackingCode field in next migration
  const referrerWithTracking = attribution
    ? `${referrer || ''} [tracking:${attribution.trackingCode}]`
    : referrer;

  const { data: linkClick, error } = await db
    .from('link_clicks')
    .insert({
      linkId,
      ipAddress,
      userAgent,
      referrer: referrerWithTracking,
      clickedAt: new Date().toISOString(),
      // Store UTM params if available (add these fields in migration)
      // utmSource: attribution?.source,
      // utmMedium: attribution?.medium,
      // utmCampaign: attribution?.campaign,
      // utmContent: attribution?.content,
      // utmTerm: attribution?.term,
    })
    .select()
    .single();

  if (error) throw error;

  // Increment click counter on marketing link
  const { data: linkData } = await db
    .from('marketing_links')
    .select('clicks')
    .eq('id', linkId)
    .limit(1);

  const link = firstOrNull(linkData) as { clicks: number } | null;
  if (link) {
    await db
      .from('marketing_links')
      .update({ clicks: (link.clicks || 0) + 1 })
      .eq('id', linkId);
  }

  return linkClick as LinkClickRecord;
}

/**
 * Get journey status for a tracking code
 */
export async function getJourneyStatus(trackingCode: string): Promise<{
  found: boolean;
  stages: {
    clicked: boolean;
    clickedAt?: string;
    intakeStarted: boolean;
    intakeStartedAt?: string;
    intakeCompleted: boolean;
    intakeCompletedAt?: string;
    returnFiled: boolean;
    returnFiledAt?: string;
  };
} | null> {
  const linkClick = await findLinkClickByTrackingCode(trackingCode);

  if (!linkClick) {
    return null;
  }

  const linkClickWithJourney = linkClick as LinkClickWithJourney;
  const intakeStartedAt = linkClickWithJourney.intakeStartedAt;
  const intakeCompletedAt = linkClickWithJourney.intakeCompletedAt;
  const returnFiledAt = linkClickWithJourney.taxReturnCompletedAt;

  return {
    found: true,
    stages: {
      clicked: true,
      clickedAt: linkClick.clickedAt,
      intakeStarted: !!intakeStartedAt,
      intakeStartedAt: intakeStartedAt || undefined,
      intakeCompleted: !!intakeCompletedAt,
      intakeCompletedAt: intakeCompletedAt || undefined,
      returnFiled: !!returnFiledAt,
      returnFiledAt: returnFiledAt || undefined,
    },
  };
}
