/**
 * Affiliate Group Service
 * Handles CRUD operations and management for affiliate groups
 */

import { db, firstOrNull } from '@/lib/db';
import { TierConfig, updateGroupStats } from './tiered-commission.service';

// Local type definitions (replacing @prisma/client)
type CommissionType = 'PERCENTAGE' | 'FLAT' | 'TIERED';

interface AffiliateGroup {
  id: string;
  name: string;
  description?: string | null;
  commissionType: CommissionType;
  commissionRate?: number | null;
  flatAmount?: number | null;
  tieredRates?: unknown;
  minimumPayout: number;
  payoutFrequency: string;
  isActive: boolean;
  totalAffiliates: number;
  totalConversions: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  affiliateGroupId?: string | null;
  affiliateStatus?: string | null;
  totalConversions: number;
  lifetimeEarnings: number | { toNumber: () => number };
  avatarUrl?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  const { data: group, error } = await db
    .from('affiliate_groups')
    .insert({
      name: input.name,
      description: input.description,
      commissionType: input.commissionType,
      commissionRate: input.commissionRate,
      flatAmount: input.flatAmount,
      tieredRates: input.tieredRates,
      minimumPayout: input.minimumPayout ?? 50,
      payoutFrequency: input.payoutFrequency ?? 'MONTHLY',
    })
    .select()
    .single();

  if (error || !group) {
    throw new Error(error?.message || 'Failed to create affiliate group');
  }

  return group as AffiliateGroup;
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
  const offset = (page - 1) * limit;

  // Build the query
  let query = db.from('affiliate_groups').select('*');
  let countQuery = db.from('affiliate_groups').select('id', { count: 'exact', head: true });

  if (search) {
    const searchPattern = `%${search}%`;
    query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
    countQuery = countQuery.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  if (typeof isActive === 'boolean') {
    query = query.eq('isActive', isActive);
    countQuery = countQuery.eq('isActive', isActive);
  }

  query = query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1);

  const [{ data: groupsData }, { count: total }] = await Promise.all([query, countQuery]);

  // Enrich with affiliate count
  const groups: GroupWithStats[] = [];
  for (const group of (groupsData || []) as AffiliateGroup[]) {
    const { count: affiliateCount } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('affiliateGroupId', group.id);

    groups.push({
      ...group,
      _count: { affiliates: affiliateCount || 0 },
    });
  }

  return {
    groups,
    total: total || 0,
    page,
    totalPages: Math.ceil((total || 0) / limit),
  };
}

/**
 * Get a single affiliate group by ID
 */
export async function getAffiliateGroupById(
  id: string,
  includeAffiliates: boolean = false
): Promise<GroupWithStats | null> {
  const { data: groupData } = await db
    .from('affiliate_groups')
    .select('*')
    .eq('id', id)
    .limit(1);

  const group = firstOrNull(groupData) as AffiliateGroup | null;
  if (!group) return null;

  // Get affiliate count
  const { count: affiliateCount } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('affiliateGroupId', id);

  const result: GroupWithStats = {
    ...group,
    _count: { affiliates: affiliateCount || 0 },
  };

  // Optionally include affiliates
  if (includeAffiliates) {
    const { data: affiliatesData } = await db
      .from('profiles')
      .select('id, firstName, lastName, email, avatarUrl, affiliateStatus, totalConversions, lifetimeEarnings')
      .eq('affiliateGroupId', id)
      .limit(10);

    (result as GroupWithStats & { affiliates?: Profile[] }).affiliates = (affiliatesData || []) as Profile[];
  }

  return result;
}

/**
 * Get a single affiliate group by name
 */
export async function getAffiliateGroupByName(
  name: string
): Promise<AffiliateGroup | null> {
  const { data: groupData } = await db
    .from('affiliate_groups')
    .select('*')
    .eq('name', name)
    .limit(1);

  return firstOrNull(groupData) as AffiliateGroup | null;
}

/**
 * Update an affiliate group
 */
export async function updateAffiliateGroup(
  id: string,
  input: UpdateGroupInput
): Promise<AffiliateGroup> {
  const { data: group, error } = await db
    .from('affiliate_groups')
    .update({
      name: input.name,
      description: input.description,
      commissionType: input.commissionType,
      commissionRate: input.commissionRate,
      flatAmount: input.flatAmount,
      tieredRates: input.tieredRates,
      minimumPayout: input.minimumPayout,
      payoutFrequency: input.payoutFrequency,
      isActive: input.isActive,
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !group) {
    throw new Error(error?.message || 'Failed to update affiliate group');
  }

  return group as AffiliateGroup;
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
  const { count: affiliateCount } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('affiliateGroupId', id);

  if ((affiliateCount || 0) > 0 && !force) {
    return {
      success: false,
      error: `Cannot delete group with ${affiliateCount} affiliates. Use force=true to remove affiliates from group and delete.`,
    };
  }

  // Remove all affiliates from the group if force is true
  if ((affiliateCount || 0) > 0) {
    await db
      .from('profiles')
      .update({ affiliateGroupId: null })
      .eq('affiliateGroupId', id);
  }

  // Delete the group
  await db.from('affiliate_groups').delete().eq('id', id);

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
  const { data: profile, error } = await db
    .from('profiles')
    .update({ affiliateGroupId: groupId })
    .eq('id', profileId)
    .select()
    .single();

  if (error || !profile) {
    throw new Error(error?.message || 'Failed to add affiliate to group');
  }

  // Update group stats
  await updateGroupStats(groupId);

  return profile as Profile;
}

/**
 * Remove an affiliate from a group
 */
export async function removeAffiliateFromGroup(
  profileId: string
): Promise<Profile> {
  // Get current group first
  const { data: profileData } = await db
    .from('profiles')
    .select('affiliateGroupId')
    .eq('id', profileId)
    .limit(1);

  const oldGroupId = (firstOrNull(profileData) as { affiliateGroupId?: string | null } | null)?.affiliateGroupId;

  // Update profile
  const { data: updatedProfile, error } = await db
    .from('profiles')
    .update({ affiliateGroupId: null })
    .eq('id', profileId)
    .select()
    .single();

  if (error || !updatedProfile) {
    throw new Error(error?.message || 'Failed to remove affiliate from group');
  }

  // Update old group stats if there was one
  if (oldGroupId) {
    await updateGroupStats(oldGroupId);
  }

  return updatedProfile as Profile;
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
  const offset = (page - 1) * limit;

  // Build the query
  let query = db.from('profiles').select('*').eq('affiliateGroupId', groupId);
  let countQuery = db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('affiliateGroupId', groupId);

  if (search) {
    const searchPattern = `%${search}%`;
    query = query.or(`firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern}`);
    countQuery = countQuery.or(`firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern}`);
  }

  query = query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1);

  const [{ data: affiliatesData }, { count: total }] = await Promise.all([query, countQuery]);

  // Enrich with user email if needed (email is already on profile in our schema)
  const affiliates = (affiliatesData || []) as Profile[];

  return {
    affiliates,
    total: total || 0,
    page,
    totalPages: Math.ceil((total || 0) / limit),
  };
}

/**
 * Bulk add affiliates to a group
 */
export async function bulkAddAffiliatesToGroup(
  profileIds: string[],
  groupId: string
): Promise<number> {
  let updateCount = 0;

  // Supabase doesn't support updateMany with IN clause directly, so we use a workaround
  for (const profileId of profileIds) {
    const { error } = await db
      .from('profiles')
      .update({ affiliateGroupId: groupId })
      .eq('id', profileId);

    if (!error) {
      updateCount++;
    }
  }

  // Update group stats
  await updateGroupStats(groupId);

  return updateCount;
}

/**
 * Move affiliates from one group to another
 */
export async function moveAffiliatesToGroup(
  profileIds: string[],
  fromGroupId: string | null,
  toGroupId: string
): Promise<number> {
  let updateCount = 0;

  for (const profileId of profileIds) {
    let query = db.from('profiles').update({ affiliateGroupId: toGroupId }).eq('id', profileId);

    if (fromGroupId) {
      query = query.eq('affiliateGroupId', fromGroupId);
    }

    const { error } = await query;
    if (!error) {
      updateCount++;
    }
  }

  // Update both group stats
  if (fromGroupId) {
    await updateGroupStats(fromGroupId);
  }
  await updateGroupStats(toGroupId);

  return updateCount;
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
  const { data: affiliatesData } = await db
    .from('profiles')
    .select('id, firstName, lastName, email, affiliateStatus, totalConversions, lifetimeEarnings')
    .eq('affiliateGroupId', groupId);

  const affiliates = (affiliatesData || []) as Profile[];

  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(
    (a) => a.affiliateStatus === 'APPROVED'
  ).length;

  let totalConversions = 0;
  let totalEarnings = 0;

  const affiliateStats = affiliates.map((a) => {
    const conversions = a.totalConversions;
    // Handle both number and Decimal types
    const earnings =
      typeof a.lifetimeEarnings === 'number'
        ? a.lifetimeEarnings
        : typeof a.lifetimeEarnings === 'object' && 'toNumber' in a.lifetimeEarnings
          ? a.lifetimeEarnings.toNumber()
          : Number(a.lifetimeEarnings) || 0;
    totalConversions += conversions;
    totalEarnings += earnings;

    return {
      profileId: a.id,
      name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || 'Unknown',
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
