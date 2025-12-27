/**
 * Tracking Code Finalization API
 *
 * POST: Finalize tracking code (permanently lock it)
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { finalizeTrackingCode } from '@/lib/services/tracking-code.service';
import { generateAffiliateStandardLinks } from '@/lib/services/affiliate-links.service';
import { generateTaxPreparerStandardLinks } from '@/lib/services/tax-preparer-links.service';

/**
 * POST: Finalize user's tracking code (permanently lock it)
 */
export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create profile - use findFirst with OR conditions for Supabase Auth compatibility
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
      select: { id: true, role: true },
    });

    // If profile doesn't exist, create one (auth.ts should have done this, but just in case)
    if (!profile) {
      const dbUser = await prisma.user.findUnique({ where: { email: session?.user?.email?.toLowerCase() } });
      if (dbUser) {
        profile = await prisma.profile.create({
          data: {
            userId: dbUser.id,
            supabaseUserId: userId,
            email: session?.user?.email?.toLowerCase() || '',
            role: 'client',
          },
          select: { id: true, role: true },
        });
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    logger.info(`Profile resolved: ${profile.id}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

    // Finalize tracking code
    const result = await finalizeTrackingCode(profile.id, baseUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Auto-generate affiliate links for approved affiliates (any role can be affiliate)
    // Note: affiliateStatus is checked, not role - affiliate is a feature, not a role
    const fullProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      select: { affiliateStatus: true },
    });

    if (fullProfile?.affiliateStatus === 'APPROVED') {
      try {
        logger.info('🎯 Generating affiliate standard links after finalization', {
          profileId: profile.id,
        });
        await generateAffiliateStandardLinks(profile.id);
        logger.info('✅ Affiliate links generated successfully');
      } catch (error) {
        // Don't fail the finalization if link generation fails
        logger.error('⚠️ Failed to generate affiliate links, but finalization succeeded', {
          error,
          profileId: profile.id,
        });
      }
    }

    // Auto-generate tax preparer links if user is a tax preparer
    if (profile.role === 'tax_preparer') {
      try {
        logger.info('🎯 Generating tax preparer standard links after finalization', {
          profileId: profile.id,
        });
        await generateTaxPreparerStandardLinks(profile.id);
        logger.info('✅ Tax preparer links generated successfully');
      } catch (error) {
        // Don't fail the finalization if link generation fails
        logger.error('⚠️ Failed to generate tax preparer links, but finalization succeeded', {
          error,
          profileId: profile.id,
        });
      }
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

    // Fetch all integrated links
    const marketingLinks = await prisma.marketingLink.findMany({
      where: { creatorId: profile.id },
      select: {
        id: true,
        code: true,
        url: true,
        shortUrl: true,
        title: true,
        description: true,
        qrCodeImageUrl: true,
        targetPage: true,
        clicks: true,
        uniqueClicks: true,
        conversions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        trackingCode: profileData?.trackingCode,
        customTrackingCode: profileData?.customTrackingCode,
        trackingCodeChanged: profileData?.trackingCodeChanged || false,
        trackingCodeFinalized: profileData?.trackingCodeFinalized || false,
        trackingCodeQRUrl: profileData?.trackingCodeQRUrl,
        canCustomize: false,
        activeCode: result.data?.code,
        trackingUrl: result.data?.trackingUrl,
      },
      integratedLinks: marketingLinks,
      message: 'Tracking code finalized successfully! Your code is now permanently locked.',
    });
  } catch (error) {
    logger.error('Error finalizing tracking code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
