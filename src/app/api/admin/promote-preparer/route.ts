import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import QRCode from 'qrcode';

// Local interfaces
interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  customTrackingCode: string | null;
  trackingCode: string | null;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
}

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
  let query = db.from('profiles')
    .select('id')
    .or(`customTrackingCode.eq.${baseCode},trackingCode.eq.${baseCode}`);

  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId);
  }

  const { data: existing } = await query.limit(1);

  if (!existing || existing.length === 0) {
    return baseCode;
  }

  // Try with number suffix
  let counter = 1;
  let code = `${baseCode}${counter}`;

  while (true) {
    let checkQuery = db.from('profiles')
      .select('id')
      .or(`customTrackingCode.eq.${code},trackingCode.eq.${code}`);

    if (excludeProfileId) {
      checkQuery = checkQuery.neq('id', excludeProfileId);
    }

    const { data: existingCode } = await checkQuery.limit(1);

    if (!existingCode || existingCode.length === 0) {
      return code;
    }

    counter++;
    code = `${baseCode}${counter}`;
  }
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
    const { data: existing } = await db.from('marketing_links')
      .select('id')
      .eq('code', code)
      .limit(1);

    if (existing && existing.length > 0) {
      logger.info(`Marketing link ${code} already exists, skipping`, { profileId });
      continue;
    }

    // Generate QR code
    const fullUrl = `https://taxgeniuspro.tax/go/${code}`;
    const qrCodeImageUrl = await generateQRCode(fullUrl);

    await db.from('marketing_links')
      .insert({
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
    const { data: userData, error: userError } = await db.from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (userError) {
      throw userError;
    }

    const user = firstOrNull<User>(userData);

    if (!user) {
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }

    // Get profile
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('*')
      .eq('userId', user.id)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'User has no profile' }, { status: 400 });
    }

    // Check if already a tax preparer
    if (profile.role === 'tax_preparer') {
      // Still allow updating tracking code
      if (!customCode) {
        return NextResponse.json(
          {
            error: 'User is already a tax preparer',
            currentTrackingCode: profile.customTrackingCode || profile.trackingCode,
          },
          { status: 400 }
        );
      }
    }

    // Validate or generate tracking code
    let trackingCode: string;
    if (customCode) {
      // Check if custom code is available
      const { data: existing } = await db.from('profiles')
        .select('id')
        .or(`customTrackingCode.eq.${customCode},trackingCode.eq.${customCode}`)
        .neq('id', profile.id)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ error: `Tracking code '${customCode}' is already taken` }, { status: 400 });
      }
      trackingCode = customCode.toLowerCase();
    } else {
      trackingCode = await generateTrackingCode(
        profile.firstName || user.name?.split(' ')[0] || 'x',
        profile.lastName || user.name?.split(' ').slice(1).join(' ') || 'x',
        profile.id
      );
    }

    // Generate profile QR code
    const profileQrUrl = `https://taxgeniuspro.tax/go/${trackingCode}-intake`;
    const qrCodeImageUrl = await generateQRCode(profileQrUrl);

    // Update profile to tax_preparer
    const { error: updateError } = await db.from('profiles')
      .update({
        role: 'tax_preparer',
        customTrackingCode: trackingCode,
        trackingCode: trackingCode,
        trackingCodeFinalized: true,
        shortLinkUsername: trackingCode,
        usePhotoInQRCodes: true,
        qrCodeLogoUrl: profile.avatarUrl,
        trackingCodeQRUrl: qrCodeImageUrl,
        // Reset affiliate status for tax preparers
        affiliateStatus: 'APPROVED',
        affiliateBondedToPreparerId: null,
      })
      .eq('id', profile.id);

    if (updateError) {
      throw updateError;
    }

    logger.info(`Profile updated to tax_preparer`, {
      userId: user.id,
      profileId: profile.id,
      trackingCode,
    });

    // Create marketing links
    const createdLinks = await createMarketingLinks(profile.id, trackingCode);

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${email} to tax preparer`,
      user: {
        id: user.id,
        email: user.email,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.name,
        profileId: profile.id,
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
    const { data: clients, error: clientsError } = await db.from('profiles')
      .select('id, userId, firstName, lastName, phone, createdAt')
      .eq('role', 'client')
      .order('createdAt', { ascending: false });

    if (clientsError) {
      throw clientsError;
    }

    // Get user emails
    const userIds = (clients || []).map((c: Profile) => c.userId);
    const { data: users } = await db.from('users')
      .select('id, email, name')
      .in('id', userIds);

    // Create lookup map
    const usersById = new Map<string, User>();
    (users || []).forEach((u: User) => {
      usersById.set(u.id, u);
    });

    return NextResponse.json({
      success: true,
      count: (clients || []).length,
      clients: (clients || []).map((p: Profile) => {
        const user = usersById.get(p.userId);
        return {
          userId: p.userId,
          profileId: p.id,
          email: user?.email,
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || user?.name,
          phone: p.phone,
          createdAt: p.createdAt,
        };
      }),
    });
  } catch (error) {
    logger.error('Error listing clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
