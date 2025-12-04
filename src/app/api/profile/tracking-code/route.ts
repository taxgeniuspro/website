/**
 * Tracking Code API
 *
 * GET: Get current user's tracking code data
 * PATCH: Customize tracking code (one-time only)
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  getUserTrackingCode,
  customizeTrackingCode,
  validateCustomTrackingCode,
  isTrackingCodeAvailable,
  assignTrackingCodeToUser,
} from '@/lib/services/tracking-code.service';

/**
 * GET: Get user's current tracking code
 */
export async function GET() {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create profile using upsert to avoid race conditions
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {}, // No updates if exists
      create: {
        userId: userId,
        role: 'lead', // Default role, user will select proper role later
      },
      select: { id: true, role: true },
    });

    logger.info(`Profile resolved: ${profile.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

    // Get tracking code data
    let trackingData = await getUserTrackingCode(profile.id, baseUrl);

    // If user doesn't have a tracking code, auto-generate one
    if (!trackingData) {
      logger.info(`Auto-generating tracking code for user ${profile.id}`);
      trackingData = await assignTrackingCodeToUser(profile.id, baseUrl);
    }

    // Get profile data for response
    const profileData = await prisma.profile.findUnique({
      where: { id: profile.id },
      select: {
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeChanged: true,
        trackingCodeFinalized: true,
        trackingCodeQRUrl: true,
        qrCodeLogoUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        qrCodeLogoUrl: profileData?.qrCodeLogoUrl,
        canCustomize: !profileData?.trackingCodeFinalized,
        activeCode: trackingData.code,
        trackingUrl: trackingData.trackingUrl,
      },
    });
  } catch (error) {
    logger.error('Error getting tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH: Customize tracking code (one-time only)
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { customCode } = body;

    if (!customCode || typeof customCode !== 'string') {
      return NextResponse.json(
        { error: 'Custom code is required and must be a string' },
        { status: 400 }
      );
    }

    // Get or create profile using upsert to avoid race conditions
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {}, // No updates if exists
      create: {
        userId: userId,
        role: 'lead', // Default role, user will select proper role later
      },
      select: { id: true, role: true },
    });

    logger.info(`Profile resolved: ${profile.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

    // Customize tracking code
    const result = await customizeTrackingCode(profile.id, customCode.trim(), baseUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get updated profile data for response
    const profileData = await prisma.profile.findUnique({
      where: { id: profile.id },
      select: {
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeChanged: true,
        trackingCodeFinalized: true,
        trackingCodeQRUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        canCustomize: !profileData?.trackingCodeFinalized,
        activeCode: result.data?.code,
        trackingUrl: result.data?.trackingUrl,
      },
      message: 'Tracking code customized successfully',
    });
  } catch (error) {
    logger.error('Error customizing tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
