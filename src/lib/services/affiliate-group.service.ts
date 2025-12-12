/**
 * Affiliate Group Service
 * Handles CRUD operations and management for affiliate groups
 */

import { prisma } from '@/lib/prisma';
import { CommissionType, type AffiliateGroup, type Profile } from '@prisma/client';
import { TierConfig, updateGroupStats } from './tiered-commission.service';

// Group creation input
export interface CreateGroupInput {
  name: string;
  description?: string;
  commissionType: CommissionType;
  commissionRate?: number;
  flatAmount?: number;
  tieredRates?: TierConfig[];
  minimumPayout?: number;
  payoutFrequency?: string;
}

// Group update input
export interface UpdateGroupInput {
  name?: string;
  description?: string;
  commissionType?: CommissionType;
  commissionRate?: number;
  flatAmount?: number;
  tieredRates?: TierConfig[];
  minimumPayout?: number;
  payoutFrequency?: string;
  isActive?: boolean;
}

// Group with affiliate count
export interface GroupWithStats extends AffiliateGroup {
  _count?: {
    affiliates: number;
  };
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

/**
 * Create a new affiliate group
 */
export async function createAffiliateGroup(
  input: CreateGroupInput
): Promise<AffiliateGroup> {
  const group = await prisma.affiliateGroup.create({
    data: {
      name: input.name,
      description: input.description,
      commissionType: input.commissionType,
      commissionRate: input.commissionRate,
      flatAmount: input.flatAmount,
      tieredRates: input.tieredRates,
      minimumPayout: input.minimumPayout ?? 50,
      payoutFrequency: input.payoutFrequency ?? 'MONTHLY',
    },
  });

  return group;
}

/**
 * Get all affiliate groups with pagination
 */
export async function getAffiliateGroups(
  options: PaginationOptions = {}
): Promise<{
  groups: GroupWithStats[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 10, search, isActive } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  const [groups, total] = await Promise.all([
    prisma.affiliateGroup.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { affiliates: true },
        },
      },
    }),
    prisma.affiliateGroup.count({ where }),
  ]);

  return {
    groups,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single affiliate group by ID
 */
export async function getAffiliateGroupById(
  id: string,
  includeAffiliates: boolean = false
): Promise<GroupWithStats | null> {
  return prisma.affiliateGroup.findUnique({
    where: { id },
    include: {
      _count: {
        select: { affiliates: true },
      },
      affiliates: includeAffiliates
        ? {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              affiliateStatus: true,
              totalConversions: true,
              lifetimeEarnings: true,
            },
            take: 10,
          }
        : false,
    },
  });
}

/**
 * Get a single affiliate group by name
 */
export async function getAffiliateGroupByName(
  name: string
): Promise<AffiliateGroup | null> {
  return prisma.affiliateGroup.findUnique({
    where: { name },
  });
}

/**
 * Update an affiliate group
 */
export async function updateAffiliateGroup(
  id: string,
  input: UpdateGroupInput
): Promise<AffiliateGroup> {
  const group = await prisma.affiliateGroup.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      commissionType: input.commissionType,
      commissionRate: input.commissionRate,
      flatAmount: input.flatAmount,
      tieredRates: input.tieredRates,
      minimumPayout: input.minimumPayout,
      payoutFrequency: input.payoutFrequency,
      isActive: input.isActive,
    },
  });

  return group;
}

/**
 * Delete an affiliate group
 * Affiliates in the group will have their groupId set to null
 */
export async function deleteAffiliateGroup(
  id: string,
  force: boolean = false
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Check if group has affiliates
  const affiliateCount = await prisma.profile.count({
    where: { affiliateGroupId: id },
  });

  if (affiliateCount > 0 && !force) {
    return {
      success: false,
      error: `Cannot delete group with ${affiliateCount} affiliates. Use force=true to remove affiliates from group and delete.`,
    };
  }

  // Remove all affiliates from the group if force is true
  if (affiliateCount > 0) {
    await prisma.profile.updateMany({
      where: { affiliateGroupId: id },
      data: { affiliateGroupId: null },
    });
  }

  // Delete the group
  await prisma.affiliateGroup.delete({
    where: { id },
  });

  return {
    success: true,
    message: force
      ? `Group deleted. ${affiliateCount} affiliates removed from group.`
      : 'Group deleted successfully.',
  };
}

/**
 * Add an affiliate to a group
 */
export async function addAffiliateToGroup(
  profileId: string,
  groupId: string
): Promise<Profile> {
  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: { affiliateGroupId: groupId },
  });

  // Update group stats
  await updateGroupStats(groupId);

  return profile;
}

/**
 * Remove an affiliate from a group
 */
export async function removeAffiliateFromGroup(
  profileId: string
): Promise<Profile> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { affiliateGroupId: true },
  });

  const oldGroupId = profile?.affiliateGroupId;

  const updatedProfile = await prisma.profile.update({
    where: { id: profileId },
    data: { affiliateGroupId: null },
  });

  // Update old group stats if there was one
  if (oldGroupId) {
    await updateGroupStats(oldGroupId);
  }

  return updatedProfile;
}

/**
 * Get affiliates in a group with pagination
 */
export async function getGroupAffiliates(
  groupId: string,
  options: PaginationOptions = {}
): Promise<{
  affiliates: Profile[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 10, search } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    affiliateGroupId: groupId,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [affiliates, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    affiliates,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Bulk add affiliates to a group
 */
export async function bulkAddAffiliatesToGroup(
  profileIds: string[],
  groupId: string
): Promise<number> {
  const result = await prisma.profile.updateMany({
    where: {
      id: { in: profileIds },
    },
    data: { affiliateGroupId: groupId },
  });

  // Update group stats
  await updateGroupStats(groupId);

  return result.count;
}

/**
 * Move affiliates from one group to another
 */
export async function moveAffiliatesToGroup(
  profileIds: string[],
  fromGroupId: string | null,
  toGroupId: string
): Promise<number> {
  const where: Record<string, unknown> = {
    id: { in: profileIds },
  };

  if (fromGroupId) {
    where.affiliateGroupId = fromGroupId;
  }

  const result = await prisma.profile.updateMany({
    where,
    data: { affiliateGroupId: toGroupId },
  });

  // Update both group stats
  if (fromGroupId) {
    await updateGroupStats(fromGroupId);
  }
  await updateGroupStats(toGroupId);

  return result.count;
}

/**
 * Get group performance statistics
 */
export async function getGroupStatistics(
  groupId: string,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<{
  totalAffiliates: number;
  activeAffiliates: number;
  totalConversions: number;
  totalEarnings: number;
  averageEarningsPerAffiliate: number;
  topPerformers: Array<{
    profileId: string;
    name: string;
    conversions: number;
    earnings: number;
  }>;
}> {
  const affiliates = await prisma.profile.findMany({
    where: { affiliateGroupId: groupId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(
    (a) => a.affiliateStatus === 'APPROVED'
  ).length;

  let totalConversions = 0;
  let totalEarnings = 0;

  const affiliateStats = affiliates.map((a) => {
    const conversions = a.totalConversions;
    const earnings = a.lifetimeEarnings.toNumber();
    totalConversions += conversions;
    totalEarnings += earnings;

    return {
      profileId: a.id,
      name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.user.email,
      conversions,
      earnings,
    };
  });

  // Sort by earnings to get top performers
  const topPerformers = affiliateStats
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  const averageEarningsPerAffiliate =
    totalAffiliates > 0 ? totalEarnings / totalAffiliates : 0;

  return {
    totalAffiliates,
    activeAffiliates,
    totalConversions,
    totalEarnings,
    averageEarningsPerAffiliate,
    topPerformers,
  };
}

/**
 * Get default tier configurations for different group types
 */
export function getDefaultTierConfigs(): {
  bronze: TierConfig[];
  silver: TierConfig[];
  gold: TierConfig[];
} {
  return {
    bronze: [
      { minConversions: 0, rate: 5 },
      { minConversions: 5, rate: 7 },
      { minConversions: 15, rate: 10 },
    ],
    silver: [
      { minConversions: 0, rate: 8 },
      { minConversions: 5, rate: 10 },
      { minConversions: 15, rate: 12 },
      { minConversions: 30, rate: 15 },
    ],
    gold: [
      { minConversions: 0, rate: 10 },
      { minConversions: 5, rate: 12 },
      { minConversions: 15, rate: 15 },
      { minConversions: 30, rate: 18 },
      { minConversions: 50, rate: 20 },
    ],
  };
}

/**
 * Validate tier configuration
 */
export function validateTierConfig(tiers: TierConfig[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(tiers) || tiers.length === 0) {
    errors.push('At least one tier is required');
    return { valid: false, errors };
  }

  // Check if tier with 0 minConversions exists
  const hasBaseTier = tiers.some((t) => t.minConversions === 0);
  if (!hasBaseTier) {
    errors.push('A base tier with 0 minimum conversions is required');
  }

  // Check for duplicate minConversions
  const minValues = tiers.map((t) => t.minConversions);
  const uniqueMinValues = new Set(minValues);
  if (minValues.length !== uniqueMinValues.size) {
    errors.push('Each tier must have a unique minimum conversion count');
  }

  // Check for valid rates
  for (const tier of tiers) {
    if (tier.rate <= 0 || tier.rate > 100) {
      errors.push(
        `Invalid rate ${tier.rate} - rates must be between 0 and 100`
      );
    }
    if (tier.minConversions < 0) {
      errors.push('Minimum conversions cannot be negative');
    }
  }

  // Check that rates increase with tiers (incentive structure)
  const sortedTiers = [...tiers].sort(
    (a, b) => a.minConversions - b.minConversions
  );
  for (let i = 1; i < sortedTiers.length; i++) {
    if (sortedTiers[i].rate <= sortedTiers[i - 1].rate) {
      errors.push('Higher tiers should have higher commission rates');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}
