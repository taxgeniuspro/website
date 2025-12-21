import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import QRCode from 'qrcode';

// Authorized emails for admin actions
const getAuthorizedAdminEmails = (): string[] => {
  const envEmails = process.env.AUTHORIZED_ADMIN_EMAILS;
  if (envEmails) {
    return envEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return ['taxgenius.tax@gmail.com', 'iradwatkins@gmail.com', 'goldenprotaxes@gmail.com'];
};

// Marketing link types for tax preparers
const MARKETING_LINK_TYPES = {
  LEAD: {
    suffix: '-lead',
    targetPage: '/contact',
    title: 'Lead Capture Form',
  },
  INTAKE: {
    suffix: '-intake',
    targetPage: '/start-filing/form',
    title: 'Tax Intake Form',
  },
  APPOINTMENT: {
    suffix: '-appt',
    targetPage: '/book',
    title: 'Appointment Booking',
  },
};

/**
 * Generate a QR code for a URL
 */
async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generate a unique tracking code for a preparer
 */
async function generateTrackingCode(firstName: string, lastName: string, excludeProfileId?: string): Promise<string> {
  const baseCode = `${(firstName?.[0] || 'x').toLowerCase()}${(lastName?.[0] || 'x').toLowerCase()}`;

  // Check if base code is available
  const existing = await prisma.profile.findFirst({
    where: {
      OR: [{ customTrackingCode: baseCode }, { trackingCode: baseCode }],
      NOT: excludeProfileId ? { id: excludeProfileId } : undefined,
    },
  });

  if (!existing) {
    return baseCode;
  }

  // Try with number suffix
  let counter = 1;
  let code = `${baseCode}${counter}`;
  while (
    await prisma.profile.findFirst({
      where: {
        OR: [{ customTrackingCode: code }, { trackingCode: code }],
        NOT: excludeProfileId ? { id: excludeProfileId } : undefined,
      },
    })
  ) {
    counter++;
    code = `${baseCode}${counter}`;
  }
  return code;
}

/**
 * Create marketing links for a tax preparer
 */
async function createMarketingLinks(profileId: string, trackingCode: string): Promise<string[]> {
  const createdLinks: string[] = [];

  for (const [type, config] of Object.entries(MARKETING_LINK_TYPES)) {
    const code = `${trackingCode}${config.suffix}`;
    const url = `${config.targetPage}?ref=${trackingCode}`;

    // Check if link already exists
    const existing = await prisma.marketingLink.findUnique({
      where: { code },
    });

    if (existing) {
      logger.info(`Marketing link ${code} already exists, skipping`, { profileId });
      continue;
    }

    // Generate QR code
    const fullUrl = `https://taxgeniuspro.tax/go/${code}`;
    const qrCodeImageUrl = await generateQRCode(fullUrl);

    await prisma.marketingLink.create({
      data: {
        creatorId: profileId,
        creatorType: 'TAX_PREPARER',
        linkType: type as 'LEAD' | 'INTAKE' | 'APPOINTMENT',
        code,
        url,
        shortUrl: `/go/${code}`,
        title: config.title,
        targetPage: config.targetPage,
        qrCodeImageUrl,
        isActive: true,
      },
    });

    createdLinks.push(`/go/${code}`);
    logger.info(`Created marketing link: ${code}`, { profileId, url });
  }

  return createdLinks;
}

/**
 * POST /api/admin/promote-preparer
 *
 * Promotes a user to tax_preparer role with full setup:
 * 1. Updates profile role to tax_preparer
 * 2. Assigns tracking code (custom or auto-generated)
 * 3. Creates 3 marketing links (lead, intake, appointment)
 * 4. Generates QR codes
 *
 * Body: {
 *   email: string,          // User's email address
 *   trackingCode?: string,  // Custom tracking code (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - You must be logged in' }, { status: 401 });
    }

    // Authorization check
    const currentUserRole = session.user.role;
    const currentUserEmail = session.user.email.toLowerCase();
    const isSuperAdmin = currentUserRole === 'admin';
    const authorizedEmails = getAuthorizedAdminEmails();
    const isAuthorizedAdmin = authorizedEmails.includes(currentUserEmail);

    if (!isSuperAdmin && !isAuthorizedAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can promote users to tax preparer' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, trackingCode: customCode } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    logger.info(`Promoting user to tax preparer: ${email}`, { customCode, by: currentUserEmail });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }

    if (!user.profile) {
      return NextResponse.json({ error: 'User has no profile' }, { status: 400 });
    }

    // Check if already a tax preparer
    if (user.profile.role === 'tax_preparer') {
      // Still allow updating tracking code
      if (!customCode) {
        return NextResponse.json(
          {
            error: 'User is already a tax preparer',
            currentTrackingCode: user.profile.customTrackingCode || user.profile.trackingCode,
          },
          { status: 400 }
        );
      }
    }

    // Validate or generate tracking code
    let trackingCode: string;
    if (customCode) {
      // Check if custom code is available
      const existing = await prisma.profile.findFirst({
        where: {
          OR: [{ customTrackingCode: customCode }, { trackingCode: customCode }],
          NOT: { id: user.profile.id },
        },
      });

      if (existing) {
        return NextResponse.json({ error: `Tracking code '${customCode}' is already taken` }, { status: 400 });
      }
      trackingCode = customCode.toLowerCase();
    } else {
      trackingCode = await generateTrackingCode(
        user.profile.firstName || user.name?.split(' ')[0] || 'x',
        user.profile.lastName || user.name?.split(' ').slice(1).join(' ') || 'x',
        user.profile.id
      );
    }

    // Generate profile QR code
    const profileQrUrl = `https://taxgeniuspro.tax/go/${trackingCode}-intake`;
    const qrCodeImageUrl = await generateQRCode(profileQrUrl);

    // Update profile to tax_preparer
    await prisma.profile.update({
      where: { id: user.profile.id },
      data: {
        role: 'tax_preparer',
        customTrackingCode: trackingCode,
        trackingCode: trackingCode,
        trackingCodeFinalized: true,
        shortLinkUsername: trackingCode,
        usePhotoInQRCodes: true,
        qrCodeLogoUrl: user.profile.avatarUrl,
        trackingCodeQRUrl: qrCodeImageUrl,
        // Reset affiliate status for tax preparers
        affiliateStatus: 'APPROVED',
        affiliateBondedToPreparerId: null,
      },
    });

    logger.info(`Profile updated to tax_preparer`, {
      userId: user.id,
      profileId: user.profile.id,
      trackingCode,
    });

    // Create marketing links
    const createdLinks = await createMarketingLinks(user.profile.id, trackingCode);

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${email} to tax preparer`,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.name,
        profileId: user.profile.id,
        trackingCode,
      },
      marketingLinks: {
        lead: `https://taxgeniuspro.tax/go/${trackingCode}-lead`,
        intake: `https://taxgeniuspro.tax/go/${trackingCode}-intake`,
        appointment: `https://taxgeniuspro.tax/go/${trackingCode}-appt`,
        created: createdLinks,
      },
      instructions: [
        'User has been promoted to tax_preparer role',
        `Tracking code assigned: ${trackingCode}`,
        `Marketing links created: ${createdLinks.length}`,
        'User should sign out and sign back in',
        'They can now access the tax preparer dashboard',
      ],
    });
  } catch (error) {
    logger.error('Error promoting user to tax preparer:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/promote-preparer
 *
 * List users who can be promoted (clients only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = session.user.role;
    const currentUserEmail = session.user.email.toLowerCase();
    const isSuperAdmin = currentUserRole === 'admin';
    const authorizedEmails = getAuthorizedAdminEmails();
    const isAuthorizedAdmin = authorizedEmails.includes(currentUserEmail);

    if (!isSuperAdmin && !isAuthorizedAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all client users who could be promoted
    const clients = await prisma.profile.findMany({
      where: { role: 'client' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: clients.length,
      clients: clients.map((p) => ({
        userId: p.userId,
        profileId: p.id,
        email: p.user.email,
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.user.name,
        phone: p.phone,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
