/**
 * Material Management Service
 *
 * Handles CRUD operations for marketing materials with QR code generation.
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.2
 */

import { db, firstOrNull } from '@/lib/db';
import {
  generateQRCode,
  generateTrackingURL,
  generateMaterialTrackingCode,
} from './qr-code.service';

// Local type definitions (replacing @prisma/client)
type LinkType = 'QR_CODE' | 'REFERRAL_LINK' | 'SHORT_LINK' | 'AFFILIATE_LINK' | 'TRACKING_LINK';

interface MarketingLinkRecord {
  id: string;
  creatorId: string;
  creatorType: string;
  linkType: LinkType;
  code: string;
  title?: string | null;
  campaign?: string | null;
  targetPage: string;
  location?: string | null;
  notes?: string | null;
  url: string;
  qrCodeFormat?: string | null;
  qrCodeImageUrl?: string | null;
  dateActivated?: string | null;
  dateExpired?: string | null;
  isActive: boolean;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  printCount?: number;
  intakeStarts?: number;
  intakeCompletes?: number;
  returnsFiled?: number;
  intakeConversionRate?: number;
  completeConversionRate?: number;
  filedConversionRate?: number;
  createdAt: string;
}

export interface CreateMaterialParams {
  creatorId: string;
  creatorType: 'TAX_PREPARER' | 'REFERRER' | 'AFFILIATE' | 'ADMIN';
  materialType: LinkType;
  campaignName: string;
  location?: string;
  notes?: string;
  targetPage?: string;
  userSlug?: string;
  brandColor?: string;
}

export interface MaterialWithStats extends MarketingLinkRecord {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

/**
 * Create a new marketing material with QR code
 */
export async function createMaterial(params: CreateMaterialParams): Promise<MarketingLinkRecord> {
  const {
    creatorId,
    creatorType,
    materialType,
    campaignName,
    location,
    notes,
    targetPage = '/start-filing',
    userSlug,
    brandColor,
  } = params;

  // Generate unique tracking code
  const trackingCode = generateMaterialTrackingCode({
    userSlug,
    materialType,
  });

  // Create the marketing link first to get the ID
  const { data: material, error: createError } = await db
    .from('marketing_links')
    .insert({
      creatorId,
      creatorType,
      linkType: materialType,
      code: trackingCode,
      title: campaignName,
      campaign: campaignName,
      targetPage,
      location,
      notes,
      qrCodeFormat: 'PNG',
      dateActivated: new Date().toISOString(),
      // Temporary URL, will be updated after QR generation
      url: `https://taxgeniuspro.tax${targetPage}`,
      isActive: true,
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      conversionRate: 0,
    })
    .select()
    .single();

  if (createError) throw createError;

  // Generate tracking URL with UTM parameters
  const trackingURL = generateTrackingURL({
    baseUrl: `https://taxgeniuspro.tax${targetPage}`,
    userId: creatorId,
    materialId: material.id,
    materialType,
    campaignName,
    location,
  });

  // Generate QR code
  const qrResult = await generateQRCode({
    url: trackingURL,
    materialId: material.id,
    format: 'PNG',
    size: 512,
    brandColor,
  });

  // Update material with final URL and QR code
  const { data: updatedMaterial, error: updateError } = await db
    .from('marketing_links')
    .update({
      url: trackingURL,
      qrCodeImageUrl: qrResult.dataUrl,
    })
    .eq('id', material.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedMaterial as MarketingLinkRecord;
}

/**
 * Get materials for a creator with pagination
 */
export async function getCreatorMaterials(
  creatorId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
  }
): Promise<{ materials: MaterialWithStats[]; total: number }> {
  const { limit = 50, offset = 0, includeInactive = false } = options || {};

  // Build query for materials
  let materialsQuery = db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', creatorId)
    .order('createdAt', { ascending: false })
    .range(offset, offset + limit - 1);

  // Build query for count
  let countQuery = db
    .from('marketing_links')
    .select('id', { count: 'exact', head: true })
    .eq('creatorId', creatorId);

  // Add isActive filter if not including inactive
  if (!includeInactive) {
    materialsQuery = materialsQuery.eq('isActive', true);
    countQuery = countQuery.eq('isActive', true);
  }

  const [{ data: materialsData }, { count: total }] = await Promise.all([
    materialsQuery,
    countQuery,
  ]);

  const materials = (materialsData || []) as MarketingLinkRecord[];

  // Calculate stats for each material
  const materialsWithStats: MaterialWithStats[] = materials.map((material) => ({
    ...material,
    totalClicks: material.clicks,
    totalConversions: material.conversions,
    conversionRate: material.clicks > 0 ? (material.conversions / material.clicks) * 100 : 0,
  }));

  return {
    materials: materialsWithStats,
    total: total || 0,
  };
}

/**
 * Get a single material by ID
 */
export async function getMaterialById(materialId: string): Promise<MarketingLinkRecord | null> {
  const { data: materialData } = await db
    .from('marketing_links')
    .select('*')
    .eq('id', materialId)
    .limit(1);

  return firstOrNull(materialData) as MarketingLinkRecord | null;
}

/**
 * Update material details
 */
export async function updateMaterial(
  materialId: string,
  updates: {
    title?: string;
    campaign?: string;
    location?: string;
    notes?: string;
    dateExpired?: Date;
    isActive?: boolean;
  }
): Promise<MarketingLinkRecord> {
  // Convert Date to ISO string if present
  const updateData: Record<string, unknown> = { ...updates };
  if (updates.dateExpired) {
    updateData.dateExpired = updates.dateExpired.toISOString();
  }

  const { data: material, error } = await db
    .from('marketing_links')
    .update(updateData)
    .eq('id', materialId)
    .select()
    .single();

  if (error) throw error;

  return material as MarketingLinkRecord;
}

/**
 * Soft delete a material (mark as inactive)
 */
export async function deleteMaterial(materialId: string): Promise<MarketingLinkRecord> {
  const { data: material, error } = await db
    .from('marketing_links')
    .update({ isActive: false })
    .eq('id', materialId)
    .select()
    .single();

  if (error) throw error;

  return material as MarketingLinkRecord;
}

/**
 * Hard delete a material (permanent)
 */
export async function permanentlyDeleteMaterial(materialId: string): Promise<void> {
  const { error } = await db
    .from('marketing_links')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
}

/**
 * Increment print count when QR code is downloaded
 */
export async function incrementPrintCount(materialId: string): Promise<void> {
  // Fetch current print count
  const { data: linkData } = await db
    .from('marketing_links')
    .select('printCount')
    .eq('id', materialId)
    .limit(1);

  const link = firstOrNull(linkData) as { printCount?: number } | null;
  const currentCount = link?.printCount || 0;

  // Update with incremented value
  await db
    .from('marketing_links')
    .update({ printCount: currentCount + 1 })
    .eq('id', materialId);
}

/**
 * Get material performance summary
 */
export async function getMaterialPerformance(materialId: string): Promise<{
  clicks: number;
  intakeStarts: number;
  intakeCompletes: number;
  returnsFiled: number;
  intakeConversionRate: number;
  completeConversionRate: number;
  filedConversionRate: number;
}> {
  const { data: materialData } = await db
    .from('marketing_links')
    .select('clicks, intakeStarts, intakeCompletes, returnsFiled, intakeConversionRate, completeConversionRate, filedConversionRate')
    .eq('id', materialId)
    .limit(1);

  const material = firstOrNull(materialData) as MarketingLinkRecord | null;

  if (!material) {
    throw new Error('Material not found');
  }

  return {
    clicks: material.clicks,
    intakeStarts: material.intakeStarts || 0,
    intakeCompletes: material.intakeCompletes || 0,
    returnsFiled: material.returnsFiled || 0,
    intakeConversionRate: material.intakeConversionRate || 0,
    completeConversionRate: material.completeConversionRate || 0,
    filedConversionRate: material.filedConversionRate || 0,
  };
}

/**
 * Get top performing materials for a creator
 */
export async function getTopMaterials(
  creatorId: string,
  options?: {
    limit?: number;
    sortBy?: 'clicks' | 'conversions' | 'conversion_rate';
  }
): Promise<MaterialWithStats[]> {
  const { limit = 15, sortBy = 'conversions' } = options || {};

  const orderByMap: Record<string, string> = {
    clicks: 'clicks',
    conversions: 'conversions',
    conversion_rate: 'conversionRate',
  };

  const orderColumn = orderByMap[sortBy] || 'conversions';

  const { data: materialsData } = await db
    .from('marketing_links')
    .select('*')
    .eq('creatorId', creatorId)
    .eq('isActive', true)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  const materials = (materialsData || []) as MarketingLinkRecord[];

  return materials.map((material) => ({
    ...material,
    totalClicks: material.clicks,
    totalConversions: material.conversions,
    conversionRate: material.clicks > 0 ? (material.conversions / material.clicks) * 100 : 0,
  }));
}

/**
 * Check if user has reached material limit
 */
export async function checkMaterialLimit(
  creatorId: string,
  limit: number = 100
): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const { count } = await db
    .from('marketing_links')
    .select('id', { count: 'exact', head: true })
    .eq('creatorId', creatorId)
    .eq('isActive', true);

  const currentCount = count || 0;

  return {
    canCreate: currentCount < limit,
    current: currentCount,
    limit,
  };
}
