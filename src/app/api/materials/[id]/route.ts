/**
 * Individual Material API Endpoint
 *
 * GET /api/materials/[id] - Get material by ID
 * PATCH /api/materials/[id] - Update material
 * DELETE /api/materials/[id] - Delete material (soft delete)
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  getMaterialPerformance,
} from '@/lib/services/material-management.service';

/**
 * GET /api/materials/[id]
 * Get a specific material
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const material = await getMaterialById(id);

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check ownership
    if (material.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get performance stats
    const performance = await getMaterialPerformance(id);

    return NextResponse.json({
      material,
      performance,
    });
  } catch (error) {
    logger.error('Get material error:', error);
    return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 });
  }
}

/**
 * PATCH /api/materials/[id]
 * Update material details
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const material = await getMaterialById(id);

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check ownership
    if (material.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, campaign, location, notes, dateExpired, isActive } = body;

    const updatedMaterial = await updateMaterial(id, {
      title,
      campaign,
      location,
      notes,
      dateExpired: dateExpired ? new Date(dateExpired) : undefined,
      isActive,
    });

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
    });
  } catch (error) {
    logger.error('Update material error:', error);
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
  }
}

/**
 * DELETE /api/materials/[id]
 * Soft delete a material
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const material = await getMaterialById(id);

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Check ownership
    if (material.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deletedMaterial = await deleteMaterial(id);

    return NextResponse.json({
      success: true,
      material: deletedMaterial,
    });
  } catch (error) {
    logger.error('Delete material error:', error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
