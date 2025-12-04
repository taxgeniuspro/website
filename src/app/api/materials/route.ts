/**
 * Materials API Endpoint
 *
 * GET /api/materials - List materials for authenticated user
 * POST /api/materials - Create new material with QR code
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createMaterial,
  getCreatorMaterials,
  checkMaterialLimit,
} from '@/lib/services/material-management.service';
import type { LinkType } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * GET /api/materials
 * List materials for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const { materials, total } = await getCreatorMaterials(userId, {
      limit,
      offset,
      includeInactive,
    });

    return NextResponse.json({
      materials,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Get materials error:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

/**
 * POST /api/materials
 * Create a new material with QR code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { materialType, campaignName, location, notes, targetPage, brandColor } = body;

    // Validate required fields
    if (!materialType || !campaignName) {
      return NextResponse.json(
        { error: 'Material type and campaign name are required' },
        { status: 400 }
      );
    }

    // Check material limit
    const limitCheck = await checkMaterialLimit(userId);
    if (!limitCheck.canCreate) {
      return NextResponse.json(
        {
          error: `Material limit reached. You have ${limitCheck.current} active materials (limit: ${limitCheck.limit})`,
        },
        { status: 403 }
      );
    }

    // Create material with QR code
    const material = await createMaterial({
      creatorId: userId,
      creatorType: 'REFERRER', // TODO: Get from user profile
      materialType: materialType as LinkType,
      campaignName,
      location,
      notes,
      targetPage,
      brandColor,
    });

    return NextResponse.json({
      success: true,
      material,
    });
  } catch (error) {
    logger.error('Create material error:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
