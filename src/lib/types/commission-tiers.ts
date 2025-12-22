/**
 * Commission Tier Type Definitions
 *
 * Supports flexible 1-5 tier commission structures for referral programs.
 * Includes backward compatibility with legacy 3-tier format.
 */

/**
 * A single tier in the flexible commission structure
 * - max: Upper limit of referral count for this tier (null = unlimited for last tier)
 * - rate: Dollar amount per referral
 */
export interface FlexibleTier {
  max: number | null;
  rate: number;
}

/**
 * Array-based flexible tier structure (1-5 tiers)
 * Example: [{max: 50, rate: 40}, {max: 100, rate: 55}, {max: null, rate: 70}]
 */
export type FlexibleTierStructure = FlexibleTier[];

/**
 * Legacy 3-tier structure for backward compatibility
 * Example: {tier1: {max: 5, rate: 50}, tier2: {max: 10, rate: 75}, tier3: {rate: 100}}
 */
export interface LegacyTierStructure {
  tier1: { max: number; rate: number };
  tier2: { max: number; rate: number };
  tier3: { rate: number };
}

/**
 * Union type for any tier structure (legacy or flexible)
 */
export type AnyTierStructure = FlexibleTierStructure | LegacyTierStructure;

/**
 * Check if the data is in legacy format
 */
export function isLegacyFormat(data: unknown): data is LegacyTierStructure {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    'tier1' in obj &&
    'tier2' in obj &&
    'tier3' in obj &&
    typeof obj.tier1 === 'object' &&
    typeof obj.tier2 === 'object' &&
    typeof obj.tier3 === 'object'
  );
}

/**
 * Check if the data is in flexible array format
 */
export function isFlexibleFormat(data: unknown): data is FlexibleTierStructure {
  if (!Array.isArray(data)) return false;
  return data.every(
    (tier) =>
      typeof tier === 'object' &&
      tier !== null &&
      'rate' in tier &&
      typeof tier.rate === 'number' &&
      ('max' in tier ? tier.max === null || typeof tier.max === 'number' : true)
  );
}

/**
 * Convert legacy 3-tier format to flexible array format
 */
export function convertLegacyToFlexible(legacy: LegacyTierStructure): FlexibleTierStructure {
  return [
    { max: legacy.tier1.max, rate: legacy.tier1.rate },
    { max: legacy.tier2.max, rate: legacy.tier2.rate },
    { max: null, rate: legacy.tier3.rate },
  ];
}

/**
 * Convert flexible format to legacy 3-tier format (if exactly 3 tiers)
 * Returns null if conversion is not possible
 */
export function convertFlexibleToLegacy(flexible: FlexibleTierStructure): LegacyTierStructure | null {
  if (flexible.length !== 3) return null;
  if (flexible[0].max === null || flexible[1].max === null) return null;

  return {
    tier1: { max: flexible[0].max, rate: flexible[0].rate },
    tier2: { max: flexible[1].max, rate: flexible[1].rate },
    tier3: { rate: flexible[2].rate },
  };
}

/**
 * Normalize any tier structure to flexible format
 */
export function normalizeToFlexible(data: AnyTierStructure): FlexibleTierStructure {
  if (isLegacyFormat(data)) {
    return convertLegacyToFlexible(data);
  }
  return data as FlexibleTierStructure;
}

/**
 * Validation result for tier structure
 */
export interface TierValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a flexible tier structure
 */
export function validateTierStructure(tiers: FlexibleTierStructure): TierValidationResult {
  const errors: string[] = [];

  // Check tier count
  if (tiers.length < 1) {
    errors.push('At least 1 tier is required');
  }
  if (tiers.length > 5) {
    errors.push('Maximum 5 tiers allowed');
  }

  // Check rates are positive
  tiers.forEach((tier, i) => {
    if (tier.rate <= 0) {
      errors.push(`Tier ${i + 1} rate must be greater than 0`);
    }
  });

  // Check max values
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    // All tiers except last must have a max value
    if (i < tiers.length - 1) {
      if (tier.max === null) {
        errors.push(`Only the last tier can have unlimited max (Tier ${i + 1} has no max)`);
      } else if (tier.max <= 0) {
        errors.push(`Tier ${i + 1} max must be greater than 0`);
      }
    }

    // Check ascending order
    if (i > 0 && tiers[i - 1].max !== null && tier.max !== null) {
      if (tier.max <= tiers[i - 1].max!) {
        errors.push(`Tier ${i + 1} max (${tier.max}) must be greater than Tier ${i} max (${tiers[i - 1].max})`);
      }
    }
  }

  // Last tier must have null max (unlimited)
  if (tiers.length > 0 && tiers[tiers.length - 1].max !== null) {
    errors.push('Last tier must have unlimited (no max)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the minimum referral count for a tier based on its index
 */
export function calculateMinFromIndex(tiers: FlexibleTierStructure, index: number): number {
  if (index === 0) return 1;
  const previousTier = tiers[index - 1];
  return (previousTier.max ?? 0) + 1;
}

/**
 * Get tier name based on index (1-indexed for display)
 */
export function getTierDisplayName(index: number): string {
  return `Tier ${index + 1}`;
}

/**
 * Calculate total earnings for a given referral count
 */
export function calculateTotalEarnings(tiers: FlexibleTierStructure, referralCount: number): number {
  let total = 0;
  let processed = 0;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierMin = i === 0 ? 1 : (tiers[i - 1].max ?? 0) + 1;
    const tierMax = tier.max ?? referralCount;

    if (referralCount < tierMin) break;

    const referralsInTier = Math.min(tierMax, referralCount) - Math.max(tierMin - 1, processed);
    if (referralsInTier > 0) {
      total += referralsInTier * tier.rate;
      processed = Math.min(tierMax, referralCount);
    }

    if (processed >= referralCount) break;
  }

  return total;
}

/**
 * Get breakdown of earnings by tier
 */
export function getEarningsBreakdown(
  tiers: FlexibleTierStructure,
  referralCount: number
): Array<{ tier: string; count: number; rate: number; subtotal: number }> {
  const breakdown: Array<{ tier: string; count: number; rate: number; subtotal: number }> = [];
  let processed = 0;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierMin = i === 0 ? 1 : (tiers[i - 1].max ?? 0) + 1;
    const tierMax = tier.max ?? referralCount;

    if (referralCount < tierMin) break;

    const referralsInTier = Math.min(tierMax, referralCount) - Math.max(tierMin - 1, processed);
    if (referralsInTier > 0) {
      breakdown.push({
        tier: getTierDisplayName(i),
        count: referralsInTier,
        rate: tier.rate,
        subtotal: referralsInTier * tier.rate,
      });
      processed = Math.min(tierMax, referralCount);
    }

    if (processed >= referralCount) break;
  }

  return breakdown;
}

/**
 * Default company tiers (fallback if not in database)
 */
export const DEFAULT_COMPANY_TIERS: FlexibleTierStructure = [
  { max: 5, rate: 50 },
  { max: 10, rate: 75 },
  { max: null, rate: 100 },
];
