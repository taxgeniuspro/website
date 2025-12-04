/**
 * Material Management Service
 *
 * Handles CRUD operations for marketing materials with QR code generation.
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.2
 */

import { prisma } from '../prisma';
import type { MarketingLink, LinkType } from '@prisma/client';
import {
  generateQRCode,
  generateTrackingURL,
  generateMaterialTrackingCode,
} from './qr-code.service';

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

export interface MaterialWithStats extends MarketingLink {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

/**
 * Create a new marketing material with QR code
 */
export async function createMaterial(params: CreateMaterialParams): Promise<MarketingLink> {
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
  const material = await prisma.marketingLink.create({
    data: {
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
      dateActivated: new Date(),
      // Temporary URL, will be updated after QR generation
      url: `https://taxgeniuspro.tax${targetPage}`,
    },
  });

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
  const updatedMaterial = await prisma.marketingLink.update({
    where: { id: material.id },
    data: {
      url: trackingURL,
      qrCodeImageUrl: qrResult.dataUrl,
    },
  });

  return updatedMaterial;
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

  const where = {
    creatorId,
    ...(includeInactive ? {} : { isActive: true }),
  };

  const [materials, total] = await Promise.all([
    prisma.marketingLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.marketingLink.count({ where }),
  ]);

  // Calculate stats for each material
  const materialsWithStats: MaterialWithStats[] = materials.map((material) => ({
    ...material,
    totalClicks: material.clicks,
    totalConversions: material.conversions,
    conversionRate: material.clicks > 0 ? (material.conversions / material.clicks) * 100 : 0,
  }));

  return {
    materials: materialsWithStats,
    total,
  };
}

/**
 * Get a single material by ID
 */
export async function getMaterialById(materialId: string): Promise<MarketingLink | null> {
  return await prisma.marketingLink.findUnique({
    where: { id: materialId },
  });
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
): Promise<MarketingLink> {
  return await prisma.marketingLink.update({
    where: { id: materialId },
    data: updates,
  });
}

/**
 * Soft delete a material (mark as inactive)
 */
export async function deleteMaterial(materialId: string): Promise<MarketingLink> {
  return await prisma.marketingLink.update({
    where: { id: materialId },
    data: { isActive: false },
  });
}

/**
 * Hard delete a material (permanent)
 */
export async function permanentlyDeleteMaterial(materialId: string): Promise<void> {
  await prisma.marketingLink.delete({
    where: { id: materialId },
  });
}

/**
 * Increment print count when QR code is downloaded
 */
export async function incrementPrintCount(materialId: string): Promise<void> {
  await prisma.marketingLink.update({
    where: { id: materialId },
    data: {
      printCount: { increment: 1 },
    },
  });
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
  const material = await prisma.marketingLink.findUnique({
    where: { id: materialId },
  });

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

  const orderByMap = {
    clicks: { clicks: 'desc' as const },
    conversions: { conversions: 'desc' as const },
    conversion_rate: { conversionRate: 'desc' as const },
  };

  const materials = await prisma.marketingLink.findMany({
    where: {
      creatorId,
      isActive: true,
    },
    orderBy: orderByMap[sortBy],
    take: limit,
  });

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
  const count = await prisma.marketingLink.count({
    where: {
      creatorId,
      isActive: true,
    },
  });

  return {
    canCreate: count < limit,
    current: count,
    limit,
  };
}
