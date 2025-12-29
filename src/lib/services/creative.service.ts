/**
 * Creative Service
 * Handles CRUD operations and management for affiliate marketing materials (creatives)
 * Inspired by Fluent Affiliate Pro's creative management system
 */

import { db, firstOrNull } from '@/lib/db';

// Local type definitions (replacing @prisma/client)
type CreativeType = 'IMAGE' | 'TEXT' | 'VIDEO' | 'BANNER' | 'EMAIL_TEMPLATE' | 'SOCIAL_POST' | 'FLYER' | 'BUSINESS_CARD';
type CreativePrivacy = 'PUBLIC' | 'PRIVATE' | 'GROUP_ONLY';
type CreativeStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED' | 'EXPIRED';

interface AffiliateCreative {
  id: string;
  name: string;
  description?: string | null;
  type: CreativeType;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  text?: string | null;
  htmlContent?: string | null;
  videoUrl?: string | null;
  downloadUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  targetUrl?: string | null;
  privacy: CreativePrivacy;
  affiliateIds: string[];
  groupIds: string[];
  status: CreativeStatus;
  startDate?: string | null;
  endDate?: string | null;
  tags: string[];
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  views: number;
  downloads: number;
  clicks: number;
  conversions: number;
  createdAt: string;
  updatedAt: string;
}

interface AffiliateGroupRecord {
  id: string;
  name: string;
}

interface CreativeUsageRecord {
  id: string;
  creativeId: string;
  affiliateId: string;
  action: string;
  platform?: string | null;
  campaignId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  usedAt: string;
}

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
  const { data: creativeData, error } = await db
    .from('affiliate_creatives')
    .insert({
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
      privacy: input.privacy ?? 'PUBLIC',
      affiliateIds: input.affiliateIds ?? [],
      groupIds: input.groupIds ?? [],
      status: input.status ?? 'ACTIVE',
      startDate: input.startDate?.toISOString(),
      endDate: input.endDate?.toISOString(),
      tags: input.tags ?? [],
      category: input.category,
      metadata: input.metadata,
      createdBy: input.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Handle group connections separately if needed (many-to-many via join table)
  if (input.groupIds?.length) {
    for (const groupId of input.groupIds) {
      await db.from('affiliate_creative_groups').insert({
        creativeId: creativeData.id,
        groupId,
      });
    }
  }

  return creativeData as AffiliateCreative;
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
  const offset = (page - 1) * limit;

  let query = db.from('affiliate_creatives').select('*');
  let countQuery = db.from('affiliate_creatives').select('id', { count: 'exact', head: true });

  // Apply filters
  if (filters.type) {
    query = query.eq('type', filters.type);
    countQuery = countQuery.eq('type', filters.type);
  }
  if (filters.privacy) {
    query = query.eq('privacy', filters.privacy);
    countQuery = countQuery.eq('privacy', filters.privacy);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
    countQuery = countQuery.eq('status', filters.status);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
    countQuery = countQuery.eq('category', filters.category);
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
    countQuery = countQuery.or(`name.ilike.${pattern},description.ilike.${pattern}`);
  }

  const [{ data: creativesData }, { count: total }] = await Promise.all([
    query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1),
    countQuery,
  ]);

  const creatives: CreativeWithStats[] = [];
  for (const creative of (creativesData || []) as AffiliateCreative[]) {
    // Get usage count
    const { count: usageCount } = await db
      .from('creative_usage')
      .select('id', { count: 'exact', head: true })
      .eq('creativeId', creative.id);

    creatives.push({
      ...creative,
      _count: { usageRecords: usageCount || 0 },
    });
  }

  return {
    creatives,
    total: total || 0,
    page,
    totalPages: Math.ceil((total || 0) / limit),
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
  const offset = (page - 1) * limit;

  // Get affiliate's group membership
  const { data: profileData } = await db
    .from('profiles')
    .select('affiliateGroupId')
    .eq('id', profileId)
    .limit(1);

  const profile = firstOrNull(profileData) as { affiliateGroupId?: string | null } | null;
  const affiliateGroupId = profile?.affiliateGroupId;

  // Get all active creatives and filter in JS (Supabase doesn't support complex OR with arrays)
  const now = new Date().toISOString();

  let query = db
    .from('affiliate_creatives')
    .select('*')
    .eq('status', 'ACTIVE');

  // Apply basic filters
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data: allCreatives } = await query.order('createdAt', { ascending: false });

  // Filter by access permissions and scheduling in JS
  const accessibleCreatives = ((allCreatives || []) as AffiliateCreative[]).filter((c) => {
    // Check scheduling
    if (c.startDate && c.startDate > now) return false;
    if (c.endDate && c.endDate < now) return false;

    // Check privacy
    if (c.privacy === 'PUBLIC') return true;
    if (c.privacy === 'PRIVATE' && c.affiliateIds?.includes(profileId)) return true;
    if (c.privacy === 'GROUP_ONLY' && affiliateGroupId && c.groupIds?.includes(affiliateGroupId)) return true;

    return false;
  });

  const total = accessibleCreatives.length;
  const creatives = accessibleCreatives.slice(offset, offset + limit);

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
  const { data: creativeData } = await db
    .from('affiliate_creatives')
    .select('*')
    .eq('id', id)
    .limit(1);

  const creative = firstOrNull(creativeData) as AffiliateCreative | null;
  if (!creative) return null;

  // Get usage count
  const { count: usageCount } = await db
    .from('creative_usage')
    .select('id', { count: 'exact', head: true })
    .eq('creativeId', id);

  return {
    ...creative,
    _count: { usageRecords: usageCount || 0 },
  };
}

/**
 * Update a creative
 */
export async function updateCreative(
  id: string,
  input: UpdateCreativeInput
): Promise<AffiliateCreative> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
  if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
  if (input.text !== undefined) updateData.text = input.text;
  if (input.htmlContent !== undefined) updateData.htmlContent = input.htmlContent;
  if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl;
  if (input.downloadUrl !== undefined) updateData.downloadUrl = input.downloadUrl;
  if (input.width !== undefined) updateData.width = input.width;
  if (input.height !== undefined) updateData.height = input.height;
  if (input.fileSize !== undefined) updateData.fileSize = input.fileSize;
  if (input.mimeType !== undefined) updateData.mimeType = input.mimeType;
  if (input.targetUrl !== undefined) updateData.targetUrl = input.targetUrl;
  if (input.privacy !== undefined) updateData.privacy = input.privacy;
  if (input.affiliateIds !== undefined) updateData.affiliateIds = input.affiliateIds;
  if (input.groupIds !== undefined) updateData.groupIds = input.groupIds;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.startDate !== undefined) updateData.startDate = input.startDate?.toISOString();
  if (input.endDate !== undefined) updateData.endDate = input.endDate?.toISOString();
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

  const { data: creative, error } = await db
    .from('affiliate_creatives')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Handle group connections if changed
  if (input.groupIds !== undefined) {
    // Remove existing group connections
    await db.from('affiliate_creative_groups').delete().eq('creativeId', id);

    // Add new connections
    for (const groupId of input.groupIds) {
      await db.from('affiliate_creative_groups').insert({
        creativeId: id,
        groupId,
      });
    }
  }

  return creative as AffiliateCreative;
}

/**
 * Delete a creative
 */
export async function deleteCreative(id: string): Promise<void> {
  await db.from('affiliate_creatives').delete().eq('id', id);
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
    updateData.startDate = startDate.toISOString();
    // If start date is in the future, set status to SCHEDULED
    if (startDate > new Date()) {
      updateData.status = 'SCHEDULED';
    }
  }

  if (endDate) {
    updateData.endDate = endDate.toISOString();
  }

  const { data: creative, error } = await db
    .from('affiliate_creatives')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return creative as AffiliateCreative;
}

/**
 * Process scheduled creatives - activate/expire based on dates
 * This should be run as a cron job
 */
export async function processScheduledCreatives(): Promise<{
  activated: number;
  expired: number;
}> {
  const now = new Date().toISOString();

  // Get scheduled creatives to activate
  const { data: toActivate } = await db
    .from('affiliate_creatives')
    .select('id')
    .eq('status', 'SCHEDULED')
    .lte('startDate', now);

  let activated = 0;
  for (const creative of (toActivate || [])) {
    await db.from('affiliate_creatives').update({ status: 'ACTIVE' }).eq('id', creative.id);
    activated++;
  }

  // Get active creatives to expire
  const { data: toExpire } = await db
    .from('affiliate_creatives')
    .select('id')
    .eq('status', 'ACTIVE')
    .lte('endDate', now);

  let expired = 0;
  for (const creative of (toExpire || [])) {
    await db.from('affiliate_creatives').update({ status: 'EXPIRED' }).eq('id', creative.id);
    expired++;
  }

  return { activated, expired };
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
  await db.from('creative_usage').insert({
    creativeId,
    affiliateId,
    action,
    platform: context?.platform,
    campaignId: context?.campaignId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
  });

  // Get current stats and increment
  const { data: creativeData } = await db
    .from('affiliate_creatives')
    .select('views, downloads')
    .eq('id', creativeId)
    .limit(1);

  const creative = firstOrNull(creativeData) as { views: number; downloads: number } | null;
  if (creative) {
    const updateField = action === 'VIEW' ? 'views' : 'downloads';
    const currentValue = action === 'VIEW' ? creative.views : creative.downloads;
    await db
      .from('affiliate_creatives')
      .update({ [updateField]: currentValue + 1 })
      .eq('id', creativeId);
  }
}

/**
 * Get creative statistics (simplified version for API responses)
 */
export async function getCreativeStatistics(
  creativeId: string,
  dateRange?: { startDate: Date; endDate: Date }
): Promise<{
  totalViews: number;
  totalDownloads: number;
  totalClicks: number;
  uniqueAffiliates: number;
  conversionRate: number;
}> {
  const analytics = await getCreativeAnalytics(creativeId, dateRange ? { start: dateRange.startDate, end: dateRange.endDate } : undefined);

  // Get creative stats
  const { data: creativeData } = await db
    .from('affiliate_creatives')
    .select('conversions, views, clicks')
    .eq('id', creativeId)
    .limit(1);

  const creative = firstOrNull(creativeData) as { conversions: number; views: number; clicks: number } | null;

  const conversionRate = creative && creative.views > 0
    ? (creative.conversions / creative.views) * 100
    : 0;

  return {
    totalViews: analytics.totalViews,
    totalDownloads: analytics.totalDownloads,
    totalClicks: creative?.clicks ?? 0,
    uniqueAffiliates: analytics.uniqueAffiliates,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
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
  let query = db
    .from('creative_usage')
    .select('action, platform, affiliateId, usedAt')
    .eq('creativeId', creativeId);

  if (dateRange) {
    query = query
      .gte('usedAt', dateRange.start.toISOString())
      .lte('usedAt', dateRange.end.toISOString());
  }

  const { data: usageData } = await query;
  const usageRecords = (usageData || []) as CreativeUsageRecord[];

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
    const dateKey = record.usedAt.split('T')[0];
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
  const { data: creatives } = await db
    .from('affiliate_creatives')
    .select('*')
    .eq('status', 'ACTIVE')
    .order(metric, { ascending: false })
    .limit(limit);

  return (creatives || []) as AffiliateCreative[];
}

/**
 * Duplicate a creative
 */
export async function duplicateCreative(
  id: string,
  newName?: string
): Promise<AffiliateCreative> {
  // Get original creative
  const { data: originalData } = await db
    .from('affiliate_creatives')
    .select('*')
    .eq('id', id)
    .limit(1);

  const original = firstOrNull(originalData) as AffiliateCreative | null;

  if (!original) {
    throw new Error('Creative not found');
  }

  // Get group connections
  const { data: groupConnections } = await db
    .from('affiliate_creative_groups')
    .select('groupId')
    .eq('creativeId', id);

  const groupIds = (groupConnections || []).map((g: { groupId: string }) => g.groupId);

  // Create duplicate
  const { data: newCreative, error } = await db
    .from('affiliate_creatives')
    .insert({
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
      status: 'INACTIVE', // Start as inactive
      tags: original.tags,
      category: original.category,
      metadata: original.metadata,
    })
    .select()
    .single();

  if (error) throw error;

  // Reconnect group relationships
  for (const groupId of groupIds) {
    await db.from('affiliate_creative_groups').insert({
      creativeId: newCreative.id,
      groupId,
    });
  }

  return newCreative as AffiliateCreative;
}

/**
 * Bulk update creative status
 */
export async function bulkUpdateCreativeStatus(
  ids: string[],
  status: CreativeStatus
): Promise<number> {
  let count = 0;

  // Supabase doesn't support IN clause with update, loop through
  for (const id of ids) {
    const { error } = await db
      .from('affiliate_creatives')
      .update({ status })
      .eq('id', id);

    if (!error) count++;
  }

  return count;
}

/**
 * Get creatives by category
 */
export async function getCreativesByCategory(): Promise<
  Array<{ category: string; count: number }>
> {
  // Supabase doesn't support groupBy, fetch all and aggregate in JS
  const { data: creatives } = await db
    .from('affiliate_creatives')
    .select('category')
    .eq('status', 'ACTIVE');

  const categoryCounts = new Map<string, number>();

  for (const creative of (creatives || []) as { category?: string | null }[]) {
    const cat = creative.category || 'Uncategorized';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }

  return Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Build filter object for creative queries
 * Note: Supabase queries are built inline in each function
 * This helper is retained for type checking and documentation
 */
function buildCreativeFilterObject(
  filters: CreativeFilters
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.type) where.type = filters.type;
  if (filters.privacy) where.privacy = filters.privacy;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.tags?.length) where.tags = filters.tags;
  if (filters.groupIds?.length) where.groupIds = filters.groupIds;
  if (filters.search) where.search = filters.search;

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
  IMAGE: 'Image',
  TEXT: 'Text Copy',
  VIDEO: 'Video',
  BANNER: 'Banner Ad',
  EMAIL_TEMPLATE: 'Email Template',
  SOCIAL_POST: 'Social Media Post',
  FLYER: 'Flyer',
  BUSINESS_CARD: 'Business Card',
};
