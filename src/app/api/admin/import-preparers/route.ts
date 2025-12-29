/**
 * Admin API: Bulk Import Tax Preparers
 *
 * Creates User + Profile records for tax preparers migrating from old system.
 * Users are created WITHOUT passwords - passwords are set when preparers sign up.
 *
 * POST /api/admin/import-preparers
 * Body: { preparers: [{ firstName, lastName, email, avatarUrl?, trackingCode? }] }
 * Headers: x-admin-setup-key: <key> OR session auth with admin role
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { nanoid } from 'nanoid';

// Generate cuid-like IDs using nanoid
function createId(): string {
  return 'cm' + nanoid(22).toLowerCase().replace(/[_-]/g, 'x');
}

interface PreparerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  trackingCode?: string; // Custom code like 'gw', 'rh', etc.
}

interface ImportResult {
  email: string;
  status: 'created' | 'skipped' | 'error';
  profileId?: string;
  trackingCode?: string;
  error?: string;
}

// Generate a tracking code from initials
function generateTrackingCode(firstName: string, lastName: string): string {
  const firstInitial = firstName?.charAt(0)?.toLowerCase() || 'x';
  const lastInitial = lastName?.charAt(0)?.toLowerCase() || 'x';
  const suffix = nanoid(4).toLowerCase();
  return `${firstInitial}${lastInitial}-${suffix}`;
}

// Admin setup key for API access (set in Coolify env vars)
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'tax-preparer-import-2025';

export async function POST(req: NextRequest) {
  try {
    // Check for admin setup key in headers
    const adminKey = req.headers.get('x-admin-setup-key');
    const hasValidKey = adminKey === ADMIN_SETUP_KEY;

    // Verify admin authentication (either session or API key)
    if (!hasValidKey) {
      const session = await auth();
      const user = session?.user;

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
      }
    }

    // Parse request body
    let body: { preparers: PreparerInput[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { preparers } = body;

    if (!preparers || !Array.isArray(preparers) || preparers.length === 0) {
      return NextResponse.json({ error: 'preparers array is required' }, { status: 400 });
    }

    logger.info('[Import Preparers] Starting import', { count: preparers.length });

    const results: ImportResult[] = [];
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const preparer of preparers) {
      const { firstName, lastName, email, phone, avatarUrl, trackingCode } = preparer;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        results.push({
          email: email || 'unknown',
          status: 'error',
          error: 'Missing required fields (firstName, lastName, email)',
        });
        errors++;
        continue;
      }

      const normalizedEmail = email.toLowerCase().trim();

      try {
        // Check if profile already exists
        const { data: existingProfile } = await db
          .from('profiles')
          .select('id, email, role')
          .eq('email', normalizedEmail)
          .limit(1);

        if (firstOrNull(existingProfile)) {
          results.push({
            email: normalizedEmail,
            status: 'skipped',
            error: 'Profile already exists',
          });
          skipped++;
          continue;
        }

        // Check if user already exists (shouldn't for migration, but check anyway)
        const { data: existingUser } = await db
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .limit(1);

        if (firstOrNull(existingUser)) {
          results.push({
            email: normalizedEmail,
            status: 'skipped',
            error: 'User already exists - they should sign in',
          });
          skipped++;
          continue;
        }

        // Generate or use provided tracking code
        const finalTrackingCode = trackingCode || generateTrackingCode(firstName, lastName);

        // Create User record first (without password - they'll set it on signup)
        const userId = createId();
        const { error: userError } = await db
          .from('users')
          .insert({
            id: userId,
            email: normalizedEmail,
            name: `${firstName.trim()} ${lastName.trim()}`,
            // hashedPassword: null - will be set when they sign up
          });

        if (userError) {
          logger.error('[Import Preparers] Failed to create user', {
            email: normalizedEmail,
            error: userError.message,
          });
          results.push({
            email: normalizedEmail,
            status: 'error',
            error: `User creation failed: ${userError.message}`,
          });
          errors++;
          continue;
        }

        // Create profile linked to the User
        const profileId = createId();
        const { data: newProfile, error: profileError } = await db
          .from('profiles')
          .insert({
            id: profileId,
            userId: userId, // Link to the User we just created
            email: normalizedEmail,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone || null,
            avatarUrl: avatarUrl || null,
            role: 'tax_preparer',
            // Tracking & QR setup
            customTrackingCode: finalTrackingCode,
            trackingCode: finalTrackingCode,
            shortLinkUsername: finalTrackingCode,
            trackingCodeFinalized: true,
            usePhotoInQRCodes: !!avatarUrl,
            qrCodeLogoUrl: avatarUrl || null,
            // Affiliate settings (preparers can refer clients)
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: new Date().toISOString(),
            // Booking defaults
            bookingEnabled: true,
            allowPhoneBookings: true,
            allowVideoBookings: true,
            allowInPersonBookings: true,
          })
          .select('id')
          .single();

        if (profileError) {
          logger.error('[Import Preparers] Failed to create profile', {
            email: normalizedEmail,
            error: profileError.message,
          });
          results.push({
            email: normalizedEmail,
            status: 'error',
            error: profileError.message,
          });
          errors++;
          continue;
        }

        // Create CRM contact for the preparer
        await db.from('crm_contacts').insert({
          email: normalizedEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone || null,
          contactType: 'PARTNER', // Tax preparers are partners
          stage: 'NEW',
          source: 'preparer_import',
        });

        logger.info('[Import Preparers] Created preparer profile', {
          email: normalizedEmail,
          profileId: newProfile.id,
          trackingCode: finalTrackingCode,
        });

        results.push({
          email: normalizedEmail,
          status: 'created',
          profileId: newProfile.id,
          trackingCode: finalTrackingCode,
        });
        created++;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[Import Preparers] Error processing preparer', {
          email: normalizedEmail,
          error: errorMsg,
        });
        results.push({
          email: normalizedEmail,
          status: 'error',
          error: errorMsg,
        });
        errors++;
      }
    }

    logger.info('[Import Preparers] Import complete', { created, skipped, errors });

    return NextResponse.json({
      success: true,
      summary: {
        total: preparers.length,
        created,
        skipped,
        errors,
      },
      results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Import Preparers] Import failed', { error: errorMsg });
    return NextResponse.json(
      { error: 'Import failed', details: errorMsg },
      { status: 500 }
    );
  }
}

// GET: Return template/example for import
export async function GET() {
  return NextResponse.json({
    description: 'Bulk import tax preparers from old system',
    method: 'POST',
    endpoint: '/api/admin/import-preparers',
    authentication: 'Admin only',
    bodyExample: {
      preparers: [
        {
          firstName: 'Gelisa',
          lastName: 'White',
          email: 'whitegelisa@gmail.com',
          phone: '+14045551234',
          avatarUrl: 'https://res.cloudinary.com/.../gelisa.jpg',
          trackingCode: 'gw', // Optional - will be auto-generated if not provided
        },
        {
          firstName: 'Ray',
          lastName: 'Hamilton',
          email: 'rhamiltonfirm@gmail.com',
          trackingCode: 'rh',
        },
      ],
    },
    notes: [
      'Profiles are created with role=tax_preparer',
      'No User record is created - preparers must sign up',
      'When they sign up (email/password or Google), they get linked to this profile',
      'Existing emails are skipped (no duplicates)',
      'trackingCode is optional - auto-generated from initials if not provided',
    ],
  });
}
