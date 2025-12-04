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

import { prisma } from '../prisma';
import type { LinkClick, MarketingLink, Prisma } from '@prisma/client';
import type { UTMAttribution } from './utm-tracking.service';
import { logger } from '@/lib/logger';

export type JourneyStage = 'CLICKED' | 'INTAKE_STARTED' | 'INTAKE_COMPLETED' | 'RETURN_FILED';

// Extended LinkClick with journey tracking metadata
type LinkClickWithJourney = LinkClick & {
  intakeStartedAt?: Date | null;
  intakeCompletedAt?: Date | null;
  taxReturnCompletedAt?: Date | null;
};

// Extended MarketingLink with aggregate stats
type MarketingLinkWithStats = MarketingLink & {
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
  linkClick?: LinkClick;
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
  const { trackingCode, stage, userId, metadata } = params;

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
    const marketingLink = await prisma.marketingLink.findUnique({
      where: { id: linkClick.linkId },
    });

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
async function findLinkClickByTrackingCode(trackingCode: string): Promise<LinkClick | null> {
  // The tracking code is stored in the UTM cookie, but we need to find the link click
  // We'll store the tracking code in the referrer field temporarily
  // TODO: Add trackingCode field to LinkClick model in next migration

  return await prisma.linkClick.findFirst({
    where: {
      referrer: {
        contains: trackingCode,
      },
    },
    orderBy: {
      clickedAt: 'desc',
    },
  });
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
): Promise<LinkClick> {
  const now = new Date();
  const updateData: Prisma.LinkClickUpdateInput = {};

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

  return await prisma.linkClick.update({
    where: { id: linkClickId },
    data: updateData,
  });
}

/**
 * Update cached counters on marketing link
 */
async function updateMarketingLinkCounters(linkId: string, stage: JourneyStage): Promise<void> {
  const updateData: Prisma.MarketingLinkUpdateInput = {};

  switch (stage) {
    case 'INTAKE_STARTED':
      // Increment intakeStarts counter
      updateData.intakeStarts = { increment: 1 };
      break;
    case 'INTAKE_COMPLETED':
      // Increment intakeCompletes and conversions counters
      updateData.intakeCompletes = { increment: 1 };
      updateData.conversions = { increment: 1 };
      break;
    case 'RETURN_FILED':
      // Increment returnsFiled counter
      updateData.returnsFiled = { increment: 1 };
      updateData.returns = { increment: 1 };
      break;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.marketingLink.update({
      where: { id: linkId },
      data: updateData,
    });

    // Recalculate conversion rates
    await recalculateConversionRates(linkId);
  }
}

/**
 * Recalculate conversion rates for a marketing link
 */
async function recalculateConversionRates(linkId: string): Promise<void> {
  const link = await prisma.marketingLink.findUnique({
    where: { id: linkId },
  });

  if (!link) return;

  const linkWithStats = link as MarketingLinkWithStats;
  const clicks = link.clicks || 0;
  const intakeStarts = linkWithStats.intakeStarts || 0;
  const intakeCompletes = linkWithStats.intakeCompletes || 0;
  const returnsFiled = linkWithStats.returnsFiled || 0;

  await prisma.marketingLink.update({
    where: { id: linkId },
    data: {
      intakeConversionRate: clicks > 0 ? (intakeStarts / clicks) * 100 : 0,
      completeConversionRate: clicks > 0 ? (intakeCompletes / clicks) * 100 : 0,
      filedConversionRate: clicks > 0 ? (returnsFiled / clicks) * 100 : 0,
    },
  });
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
}): Promise<LinkClick> {
  const { linkId, ipAddress, userAgent, referrer, attribution } = params;

  // Store tracking code in referrer field temporarily
  // TODO: Add proper trackingCode field in next migration
  const referrerWithTracking = attribution
    ? `${referrer || ''} [tracking:${attribution.trackingCode}]`
    : referrer;

  const linkClick = await prisma.linkClick.create({
    data: {
      linkId,
      ipAddress,
      userAgent,
      referrer: referrerWithTracking,
      // Store UTM params if available (add these fields in migration)
      // utmSource: attribution?.source,
      // utmMedium: attribution?.medium,
      // utmCampaign: attribution?.campaign,
      // utmContent: attribution?.content,
      // utmTerm: attribution?.term,
    },
  });

  // Increment click counter on marketing link
  await prisma.marketingLink.update({
    where: { id: linkId },
    data: {
      clicks: { increment: 1 },
    },
  });

  return linkClick;
}

/**
 * Get journey status for a tracking code
 */
export async function getJourneyStatus(trackingCode: string): Promise<{
  found: boolean;
  stages: {
    clicked: boolean;
    clickedAt?: Date;
    intakeStarted: boolean;
    intakeStartedAt?: Date;
    intakeCompleted: boolean;
    intakeCompletedAt?: Date;
    returnFiled: boolean;
    returnFiledAt?: Date;
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
      intakeStartedAt,
      intakeCompleted: !!intakeCompletedAt,
      intakeCompletedAt,
      returnFiled: !!returnFiledAt,
      returnFiledAt,
    },
  };
}
