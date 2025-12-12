/**
 * Creative Service
 * Handles CRUD operations and management for affiliate marketing materials (creatives)
 * Inspired by Fluent Affiliate Pro's creative management system
 */

import { prisma } from '@/lib/prisma';
import {
  CreativeType,
  CreativePrivacy,
  CreativeStatus,
  type AffiliateCreative,
} from '@prisma/client';

// Creative creation input
export interface CreateCreativeInput {
  name: string;
  description?: string;
  type: CreativeType;
  imageUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  htmlContent?: string;
  videoUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  targetUrl?: string;
  privacy?: CreativePrivacy;
  affiliateIds?: string[];
  groupIds?: string[];
  status?: CreativeStatus;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

// Creative update input
export interface UpdateCreativeInput {
  name?: string;
  description?: string;
  type?: CreativeType;
  imageUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  htmlContent?: string;
  videoUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  targetUrl?: string;
  privacy?: CreativePrivacy;
  affiliateIds?: string[];
  groupIds?: string[];
  status?: CreativeStatus;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  category?: string;
  metadata?: Record<string, unknown>;
}

// Filter options for listing creatives
export interface CreativeFilters {
  type?: CreativeType;
  privacy?: CreativePrivacy;
  status?: CreativeStatus;
  category?: string;
  tags?: string[];
  search?: string;
  groupIds?: string[];
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Creative with usage stats
export interface CreativeWithStats extends AffiliateCreative {
  _count?: {
    usageRecords: number;
  };
}

/**
 * Create a new creative
 */
export async function createCreative(
  input: CreateCreativeInput
): Promise<AffiliateCreative> {
  const creative = await prisma.affiliateCreative.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      imageUrl: input.imageUrl,
      thumbnailUrl: input.thumbnailUrl,
      text: input.text,
      htmlContent: input.htmlContent,
      videoUrl: input.videoUrl,
      downloadUrl: input.downloadUrl,
      width: input.width,
      height: input.height,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      targetUrl: input.targetUrl,
      privacy: input.privacy ?? CreativePrivacy.PUBLIC,
      affiliateIds: input.affiliateIds ?? [],
      groupIds: input.groupIds ?? [],
      status: input.status ?? CreativeStatus.ACTIVE,
      startDate: input.startDate,
      endDate: input.endDate,
      tags: input.tags ?? [],
      category: input.category,
      metadata: input.metadata,
      createdBy: input.createdBy,
      // Connect to groups if provided
      groups: input.groupIds?.length
        ? {
            connect: input.groupIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      groups: true,
    },
  });

  return creative;
}

/**
 * Get all creatives with pagination and filters (admin view)
 */
export async function getCreatives(
  filters: CreativeFilters = {},
  pagination: PaginationOptions = {}
): Promise<{
  creatives: CreativeWithStats[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;

  const where = buildCreativeWhereClause(filters);

  const [creatives, total] = await Promise.all([
    prisma.affiliateCreative.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usageRecords: true },
        },
        groups: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.affiliateCreative.count({ where }),
  ]);

  return {
    creatives,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get creatives accessible to a specific affiliate
 * Respects privacy settings and group membership
 */
export async function getAccessibleCreatives(
  profileId: string,
  filters: CreativeFilters = {},
  pagination: PaginationOptions = {}
): Promise<{
  creatives: AffiliateCreative[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;

  // Get affiliate's group membership
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { affiliateGroupId: true },
  });

  const affiliateGroupId = profile?.affiliateGroupId;

  // Build access filter
  const baseWhere = buildCreativeWhereClause(filters);

  // Creative must be:
  // 1. PUBLIC, or
  // 2. PRIVATE and affiliate is in affiliateIds list, or
  // 3. GROUP_ONLY and affiliate's group is in groupIds list
  const accessWhere = {
    AND: [
      baseWhere,
      { status: CreativeStatus.ACTIVE },
      {
        OR: [
          { privacy: CreativePrivacy.PUBLIC },
          {
            AND: [
              { privacy: CreativePrivacy.PRIVATE },
              { affiliateIds: { has: profileId } },
            ],
          },
          ...(affiliateGroupId
            ? [
                {
                  AND: [
                    { privacy: CreativePrivacy.GROUP_ONLY },
                    { groupIds: { has: affiliateGroupId } },
                  ],
                },
              ]
            : []),
        ],
      },
      // Check scheduling
      {
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } },
        ],
      },
      {
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    ],
  };

  const [creatives, total] = await Promise.all([
    prisma.affiliateCreative.findMany({
      where: accessWhere,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.affiliateCreative.count({ where: accessWhere }),
  ]);

  return {
    creatives,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single creative by ID
 */
export async function getCreativeById(
  id: string
): Promise<CreativeWithStats | null> {
  return prisma.affiliateCreative.findUnique({
    where: { id },
    include: {
      _count: {
        select: { usageRecords: true },
      },
      groups: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Update a creative
 */
export async function updateCreative(
  id: string,
  input: UpdateCreativeInput
): Promise<AffiliateCreative> {
  // Handle group connections
  let groupsUpdate: Record<string, unknown> | undefined;
  if (input.groupIds !== undefined) {
    groupsUpdate = {
      set: input.groupIds.map((groupId) => ({ id: groupId })),
    };
  }

  const creative = await prisma.affiliateCreative.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      imageUrl: input.imageUrl,
      thumbnailUrl: input.thumbnailUrl,
      text: input.text,
      htmlContent: input.htmlContent,
      videoUrl: input.videoUrl,
      downloadUrl: input.downloadUrl,
      width: input.width,
      height: input.height,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      targetUrl: input.targetUrl,
      privacy: input.privacy,
      affiliateIds: input.affiliateIds,
      groupIds: input.groupIds,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      tags: input.tags,
      category: input.category,
      metadata: input.metadata,
      groups: groupsUpdate,
    },
    include: {
      groups: true,
    },
  });

  return creative;
}

/**
 * Delete a creative
 */
export async function deleteCreative(id: string): Promise<void> {
  await prisma.affiliateCreative.delete({
    where: { id },
  });
}

/**
 * Schedule a creative for activation/expiration
 */
export async function scheduleCreative(
  id: string,
  startDate?: Date,
  endDate?: Date
): Promise<AffiliateCreative> {
  const updateData: Record<string, unknown> = {};

  if (startDate) {
    updateData.startDate = startDate;
    // If start date is in the future, set status to SCHEDULED
    if (startDate > new Date()) {
      updateData.status = CreativeStatus.SCHEDULED;
    }
  }

  if (endDate) {
    updateData.endDate = endDate;
  }

  return prisma.affiliateCreative.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Process scheduled creatives - activate/expire based on dates
 * This should be run as a cron job
 */
export async function processScheduledCreatives(): Promise<{
  activated: number;
  expired: number;
}> {
  const now = new Date();

  // Activate scheduled creatives whose start date has passed
  const activateResult = await prisma.affiliateCreative.updateMany({
    where: {
      status: CreativeStatus.SCHEDULED,
      startDate: { lte: now },
    },
    data: {
      status: CreativeStatus.ACTIVE,
    },
  });

  // Expire active creatives whose end date has passed
  const expireResult = await prisma.affiliateCreative.updateMany({
    where: {
      status: CreativeStatus.ACTIVE,
      endDate: { lte: now },
    },
    data: {
      status: CreativeStatus.EXPIRED,
    },
  });

  return {
    activated: activateResult.count,
    expired: expireResult.count,
  };
}

/**
 * Track creative usage (view, download, share)
 */
export async function trackCreativeUsage(
  creativeId: string,
  affiliateId: string,
  action: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'USE',
  context?: {
    platform?: string;
    campaignId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  // Create usage record
  await prisma.creativeUsage.create({
    data: {
      creativeId,
      affiliateId,
      action,
      platform: context?.platform,
      campaignId: context?.campaignId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    },
  });

  // Update creative stats
  const updateField = action === 'VIEW' ? 'views' : 'downloads';
  await prisma.affiliateCreative.update({
    where: { id: creativeId },
    data: {
      [updateField]: { increment: 1 },
    },
  });
}

/**
 * Get creative usage analytics
 */
export async function getCreativeAnalytics(
  creativeId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{
  totalViews: number;
  totalDownloads: number;
  totalShares: number;
  uniqueAffiliates: number;
  topPlatforms: Array<{ platform: string; count: number }>;
  usageOverTime: Array<{ date: string; count: number }>;
}> {
  const where: Record<string, unknown> = { creativeId };
  if (dateRange) {
    where.usedAt = {
      gte: dateRange.start,
      lte: dateRange.end,
    };
  }

  const usageRecords = await prisma.creativeUsage.findMany({
    where,
    select: {
      action: true,
      platform: true,
      affiliateId: true,
      usedAt: true,
    },
  });

  // Calculate stats
  const totalViews = usageRecords.filter((r) => r.action === 'VIEW').length;
  const totalDownloads = usageRecords.filter((r) => r.action === 'DOWNLOAD').length;
  const totalShares = usageRecords.filter((r) => r.action === 'SHARE').length;
  const uniqueAffiliates = new Set(usageRecords.map((r) => r.affiliateId)).size;

  // Top platforms
  const platformCounts = new Map<string, number>();
  for (const record of usageRecords) {
    if (record.platform) {
      platformCounts.set(
        record.platform,
        (platformCounts.get(record.platform) || 0) + 1
      );
    }
  }
  const topPlatforms = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Usage over time (group by day)
  const usageByDay = new Map<string, number>();
  for (const record of usageRecords) {
    const dateKey = record.usedAt.toISOString().split('T')[0];
    usageByDay.set(dateKey, (usageByDay.get(dateKey) || 0) + 1);
  }
  const usageOverTime = Array.from(usageByDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalViews,
    totalDownloads,
    totalShares,
    uniqueAffiliates,
    topPlatforms,
    usageOverTime,
  };
}

/**
 * Get top performing creatives
 */
export async function getTopCreatives(
  limit: number = 10,
  metric: 'downloads' | 'views' | 'conversions' = 'downloads'
): Promise<AffiliateCreative[]> {
  return prisma.affiliateCreative.findMany({
    where: { status: CreativeStatus.ACTIVE },
    orderBy: { [metric]: 'desc' },
    take: limit,
  });
}

/**
 * Duplicate a creative
 */
export async function duplicateCreative(
  id: string,
  newName?: string
): Promise<AffiliateCreative> {
  const original = await prisma.affiliateCreative.findUnique({
    where: { id },
    include: { groups: true },
  });

  if (!original) {
    throw new Error('Creative not found');
  }

  return prisma.affiliateCreative.create({
    data: {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      imageUrl: original.imageUrl,
      thumbnailUrl: original.thumbnailUrl,
      text: original.text,
      htmlContent: original.htmlContent,
      videoUrl: original.videoUrl,
      downloadUrl: original.downloadUrl,
      width: original.width,
      height: original.height,
      fileSize: original.fileSize,
      mimeType: original.mimeType,
      targetUrl: original.targetUrl,
      privacy: original.privacy,
      affiliateIds: original.affiliateIds,
      groupIds: original.groupIds,
      status: CreativeStatus.INACTIVE, // Start as inactive
      tags: original.tags,
      category: original.category,
      metadata: original.metadata as Record<string, unknown>,
      groups: {
        connect: original.groups.map((g) => ({ id: g.id })),
      },
    },
  });
}

/**
 * Bulk update creative status
 */
export async function bulkUpdateCreativeStatus(
  ids: string[],
  status: CreativeStatus
): Promise<number> {
  const result = await prisma.affiliateCreative.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  return result.count;
}

/**
 * Get creatives by category
 */
export async function getCreativesByCategory(): Promise<
  Array<{ category: string; count: number }>
> {
  const result = await prisma.affiliateCreative.groupBy({
    by: ['category'],
    _count: true,
    where: { status: CreativeStatus.ACTIVE },
  });

  return result.map((r) => ({
    category: r.category || 'Uncategorized',
    count: r._count,
  }));
}

/**
 * Build where clause for creative queries
 */
function buildCreativeWhereClause(
  filters: CreativeFilters
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.privacy) {
    where.privacy = filters.privacy;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.tags?.length) {
    where.tags = { hasSome: filters.tags };
  }

  if (filters.groupIds?.length) {
    where.groupIds = { hasSome: filters.groupIds };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } },
    ];
  }

  return where;
}

/**
 * Get available creative categories
 */
export const CREATIVE_CATEGORIES = [
  'social_media',
  'email',
  'print',
  'web',
  'video',
  'general',
] as const;

/**
 * Get creative type display names
 */
export const CREATIVE_TYPE_LABELS: Record<CreativeType, string> = {
  [CreativeType.IMAGE]: 'Image',
  [CreativeType.TEXT]: 'Text Copy',
  [CreativeType.VIDEO]: 'Video',
  [CreativeType.BANNER]: 'Banner Ad',
  [CreativeType.EMAIL_TEMPLATE]: 'Email Template',
  [CreativeType.SOCIAL_POST]: 'Social Media Post',
  [CreativeType.FLYER]: 'Flyer',
  [CreativeType.BUSINESS_CARD]: 'Business Card',
};
