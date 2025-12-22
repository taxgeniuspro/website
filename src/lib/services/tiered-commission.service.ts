/**
 * Tiered Commission Service
 * Handles commission rate calculation with support for:
 * - Percentage-based rates
 * - Flat rate commissions
 * - Tiered rates based on conversion count (flexible 1-5 tiers)
 * - Rate hierarchy (custom > bonding > group tiered > group base > default)
 */

import { prisma } from '@/lib/prisma';
import { CommissionType, Prisma, type Profile, type AffiliateGroup } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  FlexibleTierStructure,
  LegacyTierStructure,
  isLegacyFormat,
  normalizeToFlexible,
  DEFAULT_COMPANY_TIERS,
} from '@/lib/types/commission-tiers';

// Default commission rate if no other rate applies
const DEFAULT_COMMISSION_RATE = 10; // 10%
const DEFAULT_COMMISSION_TYPE = CommissionType.PERCENTAGE;

// System settings key for company default tiers
const COMMISSION_DEFAULTS_KEY = 'commission_default_tiers';

/**
 * Get company default tiers from database (with fallback)
 */
export async function getCompanyDefaultTiers(): Promise<FlexibleTierStructure> {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: COMMISSION_DEFAULTS_KEY },
    });

    if (setting) {
      const parsed = JSON.parse(setting.value);
      // Handle legacy format in database
      if (isLegacyFormat(parsed)) {
        return normalizeToFlexible(parsed);
      }
      return parsed as FlexibleTierStructure;
    }
  } catch (error) {
    console.error('Error fetching company default tiers:', error);
  }

  // Fallback to hardcoded defaults
  return DEFAULT_COMPANY_TIERS;
}

/**
 * Update company default tiers in database
 */
export async function updateCompanyDefaultTiers(
  tiers: FlexibleTierStructure,
  updatedById?: string
): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { key: COMMISSION_DEFAULTS_KEY },
    update: {
      value: JSON.stringify(tiers),
      updatedById,
      updatedAt: new Date(),
    },
    create: {
      key: COMMISSION_DEFAULTS_KEY,
      value: JSON.stringify(tiers),
      category: 'commission',
      description: 'Company-wide default commission tier structure for referrals',
      updatedById,
    },
  });
}

/**
 * Calculate commission from tier structure based on completed referral count
 * Supports both legacy (tier1/tier2/tier3) and flexible (array) formats
 */
export function calculateTierCommission(
  tierStructure: FlexibleTierStructure | LegacyTierStructure | unknown,
  completedReferralCount: number
): number {
  // Normalize to flexible format
  const tiers = normalizeToFlexible(tierStructure as FlexibleTierStructure | LegacyTierStructure);

  // Find the applicable tier based on referral count
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierMin = i === 0 ? 1 : (tiers[i - 1].max ?? 0) + 1;
    const tierMax = tier.max ?? Infinity;

    if (completedReferralCount >= tierMin && completedReferralCount <= tierMax) {
      return tier.rate;
    }
  }

  // If beyond all tiers (shouldn't happen with proper unlimited last tier), use last tier rate
  return tiers.length > 0 ? tiers[tiers.length - 1].rate : 50;
}

/**
 * Get tier name based on referral count for flexible tier structure
 */
export function getTierNameFromCountFlexible(
  count: number,
  tierStructure: FlexibleTierStructure | LegacyTierStructure | unknown
): string {
  const tiers = normalizeToFlexible(tierStructure as FlexibleTierStructure | LegacyTierStructure);

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierMin = i === 0 ? 1 : (tiers[i - 1].max ?? 0) + 1;
    const tierMax = tier.max ?? Infinity;

    if (count >= tierMin && count <= tierMax) {
      return `Tier ${i + 1}`;
    }
  }

  return `Tier ${tiers.length}`;
}

// Tier configuration interface
export interface TierConfig {
  minConversions: number;
  rate: number; // Percentage or flat amount depending on commission type
}

// Commission calculation result
export interface CommissionCalculation {
  grossAmount: number;
  commissionType: CommissionType;
  rate: number;
  finalAmount: number;
  rateSource: 'CUSTOM' | 'BONDING' | 'GROUP_TIERED' | 'GROUP_BASE' | 'DEFAULT';
  tier?: string;
  groupId?: string;
}

// Effective rate result
export interface EffectiveRate {
  type: CommissionType;
  rate: number;
  flatAmount?: number;
  source: 'CUSTOM' | 'BONDING' | 'GROUP_TIERED' | 'GROUP_BASE' | 'DEFAULT';
  tier?: string;
  groupId?: string;
  minimumPayout: number;
}

/**
 * Get the effective commission rate for an affiliate
 * Follows the rate hierarchy:
 * 1. Custom per-affiliate rate (highest priority)
 * 2. Bonding agreement rate
 * 3. Group tiered rate (based on conversion count)
 * 4. Group base rate
 * 5. System default rate (lowest priority)
 */
export async function getEffectiveCommissionRate(
  profileId: string,
  conversionCount?: number
): Promise<EffectiveRate> {
  // Fetch profile with group
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      affiliateGroup: true,
    },
  });

  if (!profile) {
    return {
      type: DEFAULT_COMMISSION_TYPE,
      rate: DEFAULT_COMMISSION_RATE,
      source: 'DEFAULT',
      minimumPayout: 50,
    };
  }

  // Use provided conversion count or fetch from profile
  const conversions = conversionCount ?? profile.totalConversions;

  // 1. Check for custom per-affiliate rate
  if (profile.customCommissionType && (profile.customCommissionRate || profile.customFlatAmount)) {
    return {
      type: profile.customCommissionType,
      rate: profile.customCommissionRate?.toNumber() ?? 0,
      flatAmount: profile.customFlatAmount?.toNumber(),
      source: 'CUSTOM',
      minimumPayout: profile.customMinimumPayout?.toNumber() ?? 50,
    };
  }

  // 2. Check for bonding agreement rate
  if (profile.affiliateBondedToPreparerId) {
    const bonding = await prisma.affiliateBonding.findUnique({
      where: {
        affiliateId_preparerId: {
          affiliateId: profileId,
          preparerId: profile.affiliateBondedToPreparerId,
        },
      },
    });

    if (bonding?.commissionStructure) {
      const bondingStructure = bonding.commissionStructure as {
        type?: CommissionType;
        rate?: number;
        flatAmount?: number;
        minimumPayout?: number;
      };

      if (bondingStructure.type && (bondingStructure.rate || bondingStructure.flatAmount)) {
        return {
          type: bondingStructure.type,
          rate: bondingStructure.rate ?? 0,
          flatAmount: bondingStructure.flatAmount,
          source: 'BONDING',
          minimumPayout: bondingStructure.minimumPayout ?? 50,
        };
      }
    }
  }

  // 3. Check for group rate
  if (profile.affiliateGroup) {
    const group = profile.affiliateGroup;

    // 3a. Check for tiered rate based on conversions
    if (group.commissionType === CommissionType.TIERED && group.tieredRates) {
      const tieredRate = calculateTieredRate(
        group.tieredRates as unknown as TierConfig[],
        conversions
      );

      if (tieredRate) {
        return {
          type: CommissionType.PERCENTAGE, // Tiered rates are percentage-based
          rate: tieredRate.rate,
          source: 'GROUP_TIERED',
          tier: tieredRate.tierName,
          groupId: group.id,
          minimumPayout: group.minimumPayout.toNumber(),
        };
      }
    }

    // 3b. Use group base rate
    if (group.commissionRate || group.flatAmount) {
      return {
        type: group.commissionType,
        rate: group.commissionRate?.toNumber() ?? 0,
        flatAmount: group.flatAmount?.toNumber(),
        source: 'GROUP_BASE',
        groupId: group.id,
        minimumPayout: group.minimumPayout.toNumber(),
      };
    }
  }

  // 4. Fall back to system default
  return {
    type: DEFAULT_COMMISSION_TYPE,
    rate: DEFAULT_COMMISSION_RATE,
    source: 'DEFAULT',
    minimumPayout: 50,
  };
}

/**
 * Calculate the tiered rate based on conversion count
 */
export function calculateTieredRate(
  tieredRates: TierConfig[],
  conversionCount: number
): { rate: number; tierName: string } | null {
  if (!tieredRates || tieredRates.length === 0) {
    return null;
  }

  // Sort tiers by minConversions in descending order
  const sortedTiers = [...tieredRates].sort(
    (a, b) => b.minConversions - a.minConversions
  );

  // Find the applicable tier
  for (const tier of sortedTiers) {
    if (conversionCount >= tier.minConversions) {
      // Generate tier name based on minConversions
      const tierName = getTierName(tier.minConversions, sortedTiers);
      return {
        rate: tier.rate,
        tierName,
      };
    }
  }

  // Return the lowest tier if no match (shouldn't happen if tiers include 0)
  const lowestTier = sortedTiers[sortedTiers.length - 1];
  return {
    rate: lowestTier.rate,
    tierName: 'Bronze',
  };
}

/**
 * Get a friendly tier name based on position
 */
function getTierName(minConversions: number, allTiers: TierConfig[]): string {
  const sortedAsc = [...allTiers].sort(
    (a, b) => a.minConversions - b.minConversions
  );
  const index = sortedAsc.findIndex((t) => t.minConversions === minConversions);

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  return tierNames[index] ?? `Tier ${index + 1}`;
}

/**
 * Calculate commission amount based on effective rate and gross amount
 */
export function calculateCommissionAmount(
  grossAmount: number,
  effectiveRate: EffectiveRate
): CommissionCalculation {
  let finalAmount: number;

  switch (effectiveRate.type) {
    case CommissionType.PERCENTAGE:
      finalAmount = (grossAmount * effectiveRate.rate) / 100;
      break;
    case CommissionType.FLAT:
      finalAmount = effectiveRate.flatAmount ?? effectiveRate.rate;
      break;
    case CommissionType.TIERED:
      // Tiered rates are calculated as percentages
      finalAmount = (grossAmount * effectiveRate.rate) / 100;
      break;
    default:
      finalAmount = (grossAmount * effectiveRate.rate) / 100;
  }

  return {
    grossAmount,
    commissionType: effectiveRate.type,
    rate: effectiveRate.rate,
    finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
    rateSource: effectiveRate.source,
    tier: effectiveRate.tier,
    groupId: effectiveRate.groupId,
  };
}

/**
 * Calculate commission for a return filed event
 */
export async function calculateReturnFiledCommission(
  referrerProfileId: string,
  grossAmount: number,
  sourceType: string,
  sourceId: string,
  clientName?: string,
  clientEmail?: string
): Promise<{
  commission: CommissionCalculation;
  effectiveRate: EffectiveRate;
}> {
  // Get the current conversion count for tier calculation
  const profile = await prisma.profile.findUnique({
    where: { id: referrerProfileId },
    select: { totalConversions: true },
  });

  const conversionCount = profile?.totalConversions ?? 0;

  // Get effective rate
  const effectiveRate = await getEffectiveCommissionRate(
    referrerProfileId,
    conversionCount
  );

  // Calculate commission
  const commission = calculateCommissionAmount(grossAmount, effectiveRate);

  return {
    commission,
    effectiveRate,
  };
}

/**
 * Lock commission rate at lead creation time
 * This ensures the rate doesn't change between lead creation and conversion
 */
export async function lockCommissionRateForLead(
  leadId: string,
  referrerProfileId: string
): Promise<void> {
  const effectiveRate = await getEffectiveCommissionRate(referrerProfileId);

  // Store the rate in the lead record (Lead model has commissionRate field)
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      commissionRate: effectiveRate.rate,
      commissionRateLockedAt: new Date(),
    },
  });
}

/**
 * Get tier progress for an affiliate
 * Returns current tier, next tier, and progress percentage
 */
export async function getTierProgress(
  profileId: string
): Promise<{
  currentTier: string;
  currentRate: number;
  nextTier?: string;
  nextRate?: number;
  conversionsNeeded?: number;
  progressPercentage: number;
  totalConversions: number;
} | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      affiliateGroup: true,
    },
  });

  if (!profile?.affiliateGroup) {
    return null;
  }

  const group = profile.affiliateGroup;

  if (group.commissionType !== CommissionType.TIERED || !group.tieredRates) {
    return {
      currentTier: 'Standard',
      currentRate: group.commissionRate?.toNumber() ?? DEFAULT_COMMISSION_RATE,
      progressPercentage: 100,
      totalConversions: profile.totalConversions,
    };
  }

  const tieredRates = group.tieredRates as unknown as TierConfig[];
  const sortedTiers = [...tieredRates].sort(
    (a, b) => a.minConversions - b.minConversions
  );

  const conversions = profile.totalConversions;

  // Find current and next tier
  let currentTierIndex = 0;
  for (let i = 0; i < sortedTiers.length; i++) {
    if (conversions >= sortedTiers[i].minConversions) {
      currentTierIndex = i;
    }
  }

  const currentTierConfig = sortedTiers[currentTierIndex];
  const nextTierConfig = sortedTiers[currentTierIndex + 1];

  const currentTierName = getTierName(currentTierConfig.minConversions, sortedTiers);

  // Calculate progress to next tier
  let progressPercentage = 100;
  let conversionsNeeded: number | undefined;
  let nextTierName: string | undefined;
  let nextRate: number | undefined;

  if (nextTierConfig) {
    nextTierName = getTierName(nextTierConfig.minConversions, sortedTiers);
    nextRate = nextTierConfig.rate;
    conversionsNeeded = nextTierConfig.minConversions - conversions;

    const rangeStart = currentTierConfig.minConversions;
    const rangeEnd = nextTierConfig.minConversions;
    const progressInRange = conversions - rangeStart;
    const totalRange = rangeEnd - rangeStart;

    progressPercentage = Math.min(100, Math.round((progressInRange / totalRange) * 100));
  }

  return {
    currentTier: currentTierName,
    currentRate: currentTierConfig.rate,
    nextTier: nextTierName,
    nextRate,
    conversionsNeeded,
    progressPercentage,
    totalConversions: conversions,
  };
}

/**
 * Update affiliate's cached stats after a conversion
 */
export async function updateAffiliateStats(
  profileId: string,
  commissionAmount: number
): Promise<void> {
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      totalConversions: {
        increment: 1,
      },
      lifetimeEarnings: {
        increment: commissionAmount,
      },
    },
  });

  // Update tier if applicable
  const tierProgress = await getTierProgress(profileId);
  if (tierProgress) {
    await prisma.profile.update({
      where: { id: profileId },
      data: {
        currentTier: tierProgress.currentTier,
      },
    });
  }
}

/**
 * Update group's cached stats
 */
export async function updateGroupStats(groupId: string): Promise<void> {
  const stats = await prisma.profile.aggregate({
    where: { affiliateGroupId: groupId },
    _count: true,
    _sum: {
      totalConversions: true,
      lifetimeEarnings: true,
    },
  });

  await prisma.affiliateGroup.update({
    where: { id: groupId },
    data: {
      totalAffiliates: stats._count,
      totalConversions: stats._sum.totalConversions ?? 0,
      totalEarnings: stats._sum.lifetimeEarnings ?? new Decimal(0),
    },
  });
}

/**
 * Calculate commission for a referrer based on the tax preparer's commission settings
 *
 * Commission Hierarchy:
 * 1. VIP Rate - Individual rate set for this specific referrer in AffiliateBonding.commissionStructure
 * 2. Preparer's Custom Tiers - If preparer has useCompanyCommissionDefaults=false and customTierStructure set
 * 3. Company Default Tiers - Fetched from database (flexible 1-5 tiers)
 *
 * @param preparerId - The tax preparer's profile ID
 * @param referrerId - The referrer's profile ID (client or affiliate)
 * @param completedReferralCount - How many completed referrals this referrer has made
 * @returns Commission amount in dollars (flat rate)
 */
export async function calculateReferrerCommission(
  preparerId: string,
  referrerId: string,
  completedReferralCount: number
): Promise<{
  amount: number;
  tier: string;
  rate: number;
  source: 'VIP' | 'PREPARER_CUSTOM' | 'COMPANY_DEFAULT';
}> {
  // 1. Check for VIP rate (individual rate for this specific referrer)
  const bonding = await prisma.affiliateBonding.findUnique({
    where: {
      affiliateId_preparerId: {
        affiliateId: referrerId,
        preparerId: preparerId,
      },
    },
  });

  if (bonding?.commissionStructure) {
    const structure = bonding.commissionStructure as {
      vipRate?: number;
      flatRate?: number;
      rate?: number;
    };

    // Check for VIP flat rate
    const vipRate = structure.vipRate ?? structure.flatRate ?? structure.rate;
    if (vipRate) {
      return {
        amount: vipRate,
        tier: 'VIP',
        rate: vipRate,
        source: 'VIP',
      };
    }
  }

  // 2. Check preparer's custom tier settings
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      useCompanyCommissionDefaults: true,
      customTierStructure: true,
    },
  });

  // Use custom tiers if preparer has them configured
  if (preparer && !preparer.useCompanyCommissionDefaults && preparer.customTierStructure) {
    const customTiers = preparer.customTierStructure;
    const rate = calculateTierCommission(customTiers, completedReferralCount);
    const tierName = getTierNameFromCountFlexible(completedReferralCount, customTiers);

    return {
      amount: rate,
      tier: tierName,
      rate,
      source: 'PREPARER_CUSTOM',
    };
  }

  // 3. Use Company Default Tiers (from database)
  const companyTiers = await getCompanyDefaultTiers();
  const rate = calculateTierCommission(companyTiers, completedReferralCount);
  const tierName = getTierNameFromCountFlexible(completedReferralCount, companyTiers);

  return {
    amount: rate,
    tier: tierName,
    rate,
    source: 'COMPANY_DEFAULT',
  };
}

/**
 * Get preparer's commission settings
 * Returns flexible tier structure format (auto-converts legacy format)
 */
export async function getPreparerCommissionSettings(preparerId: string): Promise<{
  useCompanyDefaults: boolean;
  customTierStructure: FlexibleTierStructure | null;
  companyDefaultTiers: FlexibleTierStructure;
}> {
  const preparer = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      useCompanyCommissionDefaults: true,
      customTierStructure: true,
    },
  });

  // Get company defaults from database
  const companyDefaultTiers = await getCompanyDefaultTiers();

  // Normalize custom tier structure if it exists
  let customTierStructure: FlexibleTierStructure | null = null;
  if (preparer?.customTierStructure) {
    customTierStructure = normalizeToFlexible(
      preparer.customTierStructure as unknown as FlexibleTierStructure | LegacyTierStructure
    );
  }

  return {
    useCompanyDefaults: preparer?.useCompanyCommissionDefaults ?? true,
    customTierStructure,
    companyDefaultTiers,
  };
}

/**
 * Update preparer's commission settings
 * Accepts flexible tier structure (1-5 tiers)
 */
export async function updatePreparerCommissionSettings(
  preparerId: string,
  settings: {
    useCompanyDefaults: boolean;
    customTierStructure?: FlexibleTierStructure;
  }
): Promise<void> {
  await prisma.profile.update({
    where: { id: preparerId },
    data: {
      useCompanyCommissionDefaults: settings.useCompanyDefaults,
      // Prisma Json type requires InputJsonValue
      customTierStructure: settings.useCompanyDefaults
        ? undefined
        : JSON.parse(JSON.stringify(settings.customTierStructure)),
    },
  });
}

/**
 * Set VIP rate for a specific referrer
 */
export async function setReferrerVIPRate(
  preparerId: string,
  referrerId: string,
  vipRate: number | null
): Promise<void> {
  // Find or create bonding record
  const existingBonding = await prisma.affiliateBonding.findUnique({
    where: {
      affiliateId_preparerId: {
        affiliateId: referrerId,
        preparerId: preparerId,
      },
    },
  });

  if (existingBonding) {
    // Update existing bonding
    const currentStructure = (existingBonding.commissionStructure as Record<string, unknown>) || {};
    await prisma.affiliateBonding.update({
      where: { id: existingBonding.id },
      data: {
        commissionStructure: vipRate === null
          ? Prisma.JsonNull
          : { ...currentStructure, vipRate },
      },
    });
  } else if (vipRate !== null) {
    // Create new bonding with VIP rate
    await prisma.affiliateBonding.create({
      data: {
        affiliateId: referrerId,
        preparerId: preparerId,
        commissionStructure: { vipRate },
        isActive: true,
      },
    });
  }
}

/**
 * Get all referrers for a preparer with their commission info
 */
export async function getPreparerReferrersWithRates(preparerId: string): Promise<Array<{
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  completedReferrals: number;
  currentTier: string;
  currentRate: number;
  vipRate: number | null;
  totalEarnings: number;
}>> {
  // Get bonded affiliates
  const bondings = await prisma.affiliateBonding.findMany({
    where: { preparerId, isActive: true },
    include: {
      affiliate: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  // Get preparer's settings for calculating rates
  const preparerSettings = await getPreparerCommissionSettings(preparerId);

  const results = await Promise.all(
    bondings.map(async (bonding) => {
      const affiliate = bonding.affiliate;

      // Get completed referral count for this referrer
      const completedReferrals = await prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: preparerId,
          referrerUsername: affiliate.customTrackingCode ?? undefined,
          convertedToClient: true,
        },
      });

      // Calculate what rate they would get
      const rateInfo = await calculateReferrerCommission(preparerId, affiliate.id, completedReferrals);

      // Get VIP rate if set
      const bondingStructure = bonding.commissionStructure as { vipRate?: number } | null;
      const vipRate = bondingStructure?.vipRate ?? null;

      // Get total earnings
      const earnings = await prisma.commission.aggregate({
        where: {
          referrerId: affiliate.id,
          status: 'PAID',
        },
        _sum: { amount: true },
      });

      return {
        referrerId: affiliate.id,
        referrerName: `${affiliate.firstName || ''} ${affiliate.lastName || ''}`.trim() || affiliate.user.email,
        referrerEmail: affiliate.user.email,
        completedReferrals,
        currentTier: rateInfo.tier,
        currentRate: rateInfo.rate,
        vipRate,
        totalEarnings: earnings._sum.amount?.toNumber() ?? 0,
      };
    })
  );

  return results;
}
