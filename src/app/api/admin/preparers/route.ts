import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';

// Local interface
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  companyName: string | null;
  phone: string | null;
  userId: string;
  customTrackingCode: string | null;
  bookingEnabled: boolean;
  allowPhoneBookings: boolean;
  allowVideoBookings: boolean;
  allowInPersonBookings: boolean;
  requireApprovalForBookings: boolean;
  customBookingMessage: string | null;
  bookingCalendarColor: string | null;
}

/**
 * GET /api/admin/preparers
 *
 * Fetch all tax preparers with optional booking settings
 * Admin-only endpoint
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as UserRole | undefined;
    const permissions = getUserPermissions(role || 'client');

    // Only admins can access this endpoint
    if (!['admin', 'full'].includes(permissions.users)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeBookingSettings = searchParams.get('includeBookingSettings') === 'true';

    // Build select fields
    let selectFields = 'id, firstName, lastName, email, role, companyName, phone, userId, customTrackingCode';
    if (includeBookingSettings) {
      selectFields += ', bookingEnabled, allowPhoneBookings, allowVideoBookings, allowInPersonBookings, requireApprovalForBookings, customBookingMessage, bookingCalendarColor';
    }

    const { data: preparers, error: preparersError } = await db.from('profiles')
      .select(selectFields)
      .in('role', ['tax_preparer', 'admin'])
      .order('role', { ascending: true })
      .order('firstName', { ascending: true });

    if (preparersError) {
      throw preparersError;
    }

    // Format email for display (get from Clerk user or profile)
    const preparersWithEmail = (preparers || []).map((preparer: Profile) => {
      let email = preparer.email || '';

      if (!email && preparer.userId) {
        // Fallback placeholder if no email
        email = `${preparer.firstName?.toLowerCase()}.${preparer.lastName?.toLowerCase()}@taxgeniuspro.tax`;
      }

      return {
        ...preparer,
        email,
      };
    });

    return NextResponse.json({
      success: true,
      preparers: preparersWithEmail,
      count: preparersWithEmail.length,
    });
  } catch (error) {
    logger.error('[Admin Preparers API] Error fetching preparers', error);
    return NextResponse.json({ error: 'Failed to fetch preparers' }, { status: 500 });
  }
}
