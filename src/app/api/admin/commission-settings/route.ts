/**
 * Admin Commission Settings API
 *
 * Allows administrators to manage company-wide default commission tiers.
 * These tiers are used when tax preparers choose "Use Company Defaults".
 *
 * GET: Retrieve current company default tiers
 * PUT: Update company default tiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import {
  getCompanyDefaultTiers,
  updateCompanyDefaultTiers,
} from '@/lib/services/tiered-commission.service';
import { logger } from '@/lib/logger';
import {
  FlexibleTierStructure,
  validateTierStructure,
} from '@/lib/types/commission-tiers';

// Local interfaces
interface SystemSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedById: string | null;
}

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  userId: string;
}

interface User {
  email: string;
}

/**
 * GET /api/admin/commission-settings
 *
 * Returns the current company default commission tiers
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get company default tiers
    const tiers = await getCompanyDefaultTiers();

    // Get last update info
    const { data: settingData } = await db.from('system_settings')
      .select('*')
      .eq('key', 'commission_default_tiers')
      .limit(1);

    const setting = firstOrNull<SystemSetting>(settingData);

    let updatedByName: string | null = null;
    if (setting?.updatedById) {
      const { data: updaterData } = await db.from('profiles')
        .select('firstName, lastName, userId')
        .eq('id', setting.updatedById)
        .limit(1);

      const updater = firstOrNull<Profile>(updaterData);
      if (updater) {
        const name = `${updater.firstName || ''} ${updater.lastName || ''}`.trim();
        if (name) {
          updatedByName = name;
        } else {
          // Get email from users table
          const { data: userData } = await db.from('users')
            .select('email')
            .eq('id', updater.userId)
            .limit(1);
          const userRecord = firstOrNull<User>(userData);
          updatedByName = userRecord?.email || null;
        }
      }
    }

    return NextResponse.json({
      tiers,
      lastUpdatedAt: setting?.updatedAt ?? null,
      lastUpdatedBy: updatedByName,
    });
  } catch (error) {
    logger.error('Error fetching admin commission settings', { error });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/commission-settings
 *
 * Updates the company default commission tiers
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get admin's profile ID for audit
    const { data: profileData } = await db.from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull<{ id: string }>(profileData);

    const body = await request.json();
    const { tiers } = body;

    // Validate tiers
    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'tiers must be an array' },
        { status: 400 }
      );
    }

    const validation = validateTierStructure(tiers as FlexibleTierStructure);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid tier structure: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Update company default tiers
    await updateCompanyDefaultTiers(tiers as FlexibleTierStructure, profile?.id);

    logger.info('Company commission settings updated', {
      updatedBy: user.id,
      tierCount: tiers.length,
    });

    // Return updated tiers
    const updatedTiers = await getCompanyDefaultTiers();

    return NextResponse.json({
      success: true,
      tiers: updatedTiers,
    });
  } catch (error) {
    logger.error('Error updating admin commission settings', { error });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
