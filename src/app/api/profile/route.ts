/**
 * Profile API
 *
 * GET: Fetch user's profile data
 * PATCH: Update user's profile data
 */

import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET: Fetch user's profile
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile with all fields needed for marketing
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        role: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        companyName: true,
        licenseNo: true,
        qrCodeLogoUrl: true,
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeQRUrl: true,
        professionalTitle: true,
        website: true,
        publicAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PATCH: Update user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'firstName',
      'lastName',
      'middleName',
      'phone',
      'bio',
      'companyName',
      'licenseNo',
      'professionalTitle',
      'website',
      'publicAddress',
    ];

    // Filter out any fields that aren't allowed
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Update profile
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: updateData,
    });

    logger.info(`Profile updated for user ${userId}`, { fields: Object.keys(updateData) });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
