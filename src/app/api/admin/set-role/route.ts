import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// Authorized emails that can upgrade users to tax_preparer or affiliate
const AUTHORIZED_ADMIN_EMAILS = [
  'taxgeniuses.tax@gmail.com',
  'taxgenius.tax@gmail.com',
  'iradwatkins@gmail.com',
  'goldenprotaxes@gmail.com',
];

/**
 * API endpoint to set admin role for a user
 * RESTRICTED TO SUPER_ADMIN or AUTHORIZED ADMINS
 * POST /api/admin/set-role
 * Body: { email: string, role: string }
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
    const isAuthorizedAdmin = AUTHORIZED_ADMIN_EMAILS.includes(currentUserEmail);

    if (!isSuperAdmin && !isAuthorizedAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Only super admins or authorized administrators can change user roles' },
        { status: 403 }
      );
    }

    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'lead', 'client', 'tax_preparer', 'affiliate'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Authorized admins (non-super admins) can only assign tax_preparer or affiliate roles
    if (isAuthorizedAdmin && !isSuperAdmin) {
      if (role !== 'tax_preparer' && role !== 'affiliate') {
        return NextResponse.json(
          { error: 'Authorized admins can only assign tax_preparer or affiliate roles. Contact a super admin for other role assignments.' },
          { status: 403 }
        );
      }
    }

    logger.info(`🔍 Looking for user with email: ${email}`);

    // Get user by email from database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }

    logger.info(`✅ Found user: ${user.profile?.firstName || ''} ${user.profile?.lastName || ''} (${user.id})`);

    // Check current role
    const currentRole = user.profile?.role;
    logger.info(`📋 Current role: ${currentRole || 'none'}`);

    // SPECIAL CASE: Client → Tax Preparer conversion requires account reset
    const isClientToPreparerConversion = currentRole === 'client' && role === 'tax_preparer';
    let resetDetails: string[] = [];

    if (isClientToPreparerConversion) {
      // Generate new tracking code for the preparer
      const firstName = user.profile?.firstName || 'User';
      const lastName = user.profile?.lastName || '';
      const initials = `${firstName[0] || 'u'}${lastName[0] || 'p'}`.toLowerCase();
      const newTrackingCode = `${initials}-${nanoid(6)}`;
      const newShortLinkUsername = initials;

      // Reset client data and set up as tax preparer
      await prisma.profile.update({
        where: { userId: user.id },
        data: {
          role: 'tax_preparer',
          // Reset client affiliate fields
          affiliateStatus: 'APPROVED', // Tax preparers auto-approved
          affiliateBondedToPreparerId: null, // Clear client bonding
          affiliateGroupId: null,
          customCommissionType: null,
          customCommissionRate: null,
          customFlatAmount: null,
          // Reset client tax filing status
          hasFiledTaxes: false,
          firstFilingDate: null,
          // Generate new preparer tracking code
          trackingCode: newTrackingCode,
          customTrackingCode: null,
          trackingCodeFinalized: false,
          shortLinkUsername: newShortLinkUsername,
          shortLinkUsernameChanged: false,
          // Reset performance stats (will rebuild as preparer)
          totalConversions: 0,
          lifetimeEarnings: new Prisma.Decimal(0),
          currentTier: null,
          // Reset referral program opt-out (preparers use different system)
          hideReferralProgram: false,
        },
      });

      resetDetails = [
        'Client data has been reset',
        `New tracking code assigned: ${newTrackingCode}`,
        'Affiliate status set to APPROVED',
        'Performance stats reset to 0',
        'Historical commissions are preserved',
      ];

      logger.info(`🔄 Client ${email} converted to tax_preparer with account reset`, {
        newTrackingCode,
        resetDetails,
      });
    } else {
      // Standard role update (no reset)
      await prisma.profile.update({
        where: { userId: user.id },
        data: { role: role as any },
      });
    }

    logger.info(`✅ Successfully set ${role} role for ${email}`);

    return NextResponse.json({
      success: true,
      message: isClientToPreparerConversion
        ? `Successfully converted ${email} from client to tax_preparer. Account has been reset.`
        : `Successfully set ${role} role for ${email}. User must sign out and sign back in for changes to take effect.`,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`,
        previousRole: currentRole,
        newRole: role,
      },
      // Include reset details for client→preparer conversion
      accountReset: isClientToPreparerConversion ? {
        wasReset: true,
        details: resetDetails,
      } : undefined,
      instructions: isClientToPreparerConversion
        ? [
            'Account has been reset for tax preparer role',
            'New tracking code has been assigned',
            'User must sign out and sign back in',
            'Historical commissions are preserved',
          ]
        : [
            'Role has been updated in the database',
            'User must completely sign out (not just close browser)',
            'Sign back in to get a fresh session with the new role',
            'Or use an incognito/private window to test immediately',
          ],
    });
  } catch (error) {
    logger.error('❌ Error setting role:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
