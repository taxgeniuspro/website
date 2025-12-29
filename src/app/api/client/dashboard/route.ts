import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  userId: string | null;
  supabaseUserId: string | null;
  email: string | null;
  role: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  affiliateStatus: string | null;
  affiliateApprovedAt: string | null;
  trackingCode: string | null;
  customTrackingCode: string | null;
  hideReferralProgram: boolean | null;
}

interface User {
  id: string;
  email: string | null;
  name: string | null;
}

interface TaxIntakeLead {
  id: string;
  completed: boolean;
  tax_year: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  full_form_data: Record<string, unknown> | null;
  referrerUsername: string | null;
  clientFolderId: string | null;
}

interface ClientFolder {
  id: string;
  name: string;
  path: string;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
}

interface PreparerProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  userId: string | null;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string | null;
  secureUrl: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface TaxReturn {
  id: string;
  profileId: string;
  taxYear: number;
  status: string;
  filedDate: string | null;
  acceptedDate: string | null;
  refundAmount: number | null;
  oweAmount: number | null;
  updatedAt: string;
}

/**
 * GET /api/client/dashboard
 * Returns comprehensive dashboard data for client including:
 * - Current tax return with progress
 * - Documents
 * - Recent activity
 * - Messages (if implemented)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile - create one if it doesn't exist (new OAuth users)
    // Use OR conditions to match by supabaseUserId, userId, or email
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    let profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      // New user - create profile on-the-fly
      // This handles the race condition where dashboard loads before events.signIn completes
      logger.info('Creating profile for new user on dashboard access', { userId });

      try {
        // First verify the User record exists in the database
        const { data: userData, error: userError } = await db
          .from('users')
          .select('id, email, name')
          .eq('id', userId)
          .limit(1);

        const userExists = firstOrNull<User>(userData);

        if (userError || !userExists) {
          // User record doesn't exist yet - likely still being created by PrismaAdapter
          logger.warn('User record not found during dashboard access - race condition', { userId });
          return NextResponse.json({
            error: 'Account setup in progress. Please refresh the page.',
            retryable: true,
          }, { status: 503 });
        }

        const user = session.user;
        const nameParts = user?.name?.split(' ').filter((part: string) => part.length > 0) || [];
        let firstName = '';
        let middleName: string | undefined;
        let lastName = '';

        if (nameParts.length === 1) {
          firstName = nameParts[0];
        } else if (nameParts.length === 2) {
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else if (nameParts.length >= 3) {
          firstName = nameParts[0];
          middleName = nameParts.slice(1, -1).join(' ');
          lastName = nameParts[nameParts.length - 1];
        }

        // Try to upsert - first check if exists by userId
        const { data: existingProfile } = await db
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        if (existingProfile && existingProfile.length > 0) {
          profile = existingProfile[0] as Profile;
        } else {
          // Create new profile
          const { data: newProfile, error: createError } = await db
            .from('profiles')
            .insert({
              user_id: userId,
              role: 'client',
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              affiliate_status: 'APPROVED',
              affiliate_approved_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          profile = newProfile as Profile;
        }

        logger.info('Created profile for new user', { userId, profileId: profile.id });
      } catch (profileCreateError) {
        // Profile creation failed - log details and return error
        logger.error('Failed to create profile for new user on dashboard access', {
          userId,
          error: profileCreateError instanceof Error ? profileCreateError.message : String(profileCreateError),
          stack: profileCreateError instanceof Error ? profileCreateError.stack : undefined,
        });
        return NextResponse.json({
          error: 'Failed to setup your account. Please try refreshing the page.',
          retryable: true,
        }, { status: 500 });
      }
    }

    // Get tax year from query param or use current filing year
    const currentFilingYear = getCurrentFilingTaxYear();
    const requestedYear = req.nextUrl.searchParams.get('year');
    const taxYear = requestedYear ? parseInt(requestedYear) : currentFilingYear;

    // Check for completed tax intake for this specific tax year
    // Include full_form_data so client can see their intake summary
    const { data: taxIntakeData } = await db
      .from('tax_intake_leads')
      .select('id, completed, tax_year, first_name, last_name, email, phone, address_line_1, address_line_2, city, state, zip_code, full_form_data, referrer_username, client_folder_id')
      .or(`profile_id.eq.${profile.id},email.eq.${session.user?.email || ''}`)
      .eq('completed', true)
      .eq('tax_year', taxYear)
      .order('created_at', { ascending: false })
      .limit(1);

    const taxIntake = firstOrNull<TaxIntakeLead>(taxIntakeData);

    // Get client folder if exists
    let clientFolder: ClientFolder | null = null;
    if (taxIntake?.clientFolderId) {
      const { data: folderData } = await db
        .from('client_folders')
        .select('id, name, path')
        .eq('id', taxIntake.clientFolderId)
        .limit(1);
      clientFolder = firstOrNull<ClientFolder>(folderData);
    }

    // Get assigned preparer (via client_preparers table)
    const { data: clientPreparerData } = await db
      .from('client_preparers')
      .select('id, client_id, preparer_id, is_active')
      .eq('client_id', profile.id)
      .eq('is_active', true)
      .limit(1);

    const clientPreparer = firstOrNull<ClientPreparer>(clientPreparerData);

    let assignedPreparer: { id: string; name: string; email: string; avatarUrl: string | null } | null = null;
    if (clientPreparer) {
      const { data: preparerData } = await db
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, user_id')
        .eq('id', clientPreparer.preparerId)
        .limit(1);

      const preparer = firstOrNull<PreparerProfile>(preparerData);
      if (preparer) {
        // Get preparer's email from users table
        let preparerEmail = '';
        if (preparer.userId) {
          const { data: preparerUser } = await db
            .from('users')
            .select('email')
            .eq('id', preparer.userId)
            .limit(1);
          preparerEmail = preparerUser?.[0]?.email || '';
        }

        assignedPreparer = {
          id: preparer.id,
          name: `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim(),
          email: preparerEmail,
          avatarUrl: preparer.avatarUrl,
        };
      }
    }

    // Count all documents for this client
    const { count: totalDocumentsCount } = await db
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    // Get tax return (taxYear already defined above)
    const { data: taxReturnData } = await db
      .from('tax_returns')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('tax_year', taxYear)
      .limit(1);

    const taxReturn = firstOrNull<TaxReturn>(taxReturnData);

    // Get documents for this tax return
    let taxReturnDocuments: Document[] = [];
    if (taxReturn) {
      const { data: docsData } = await db
        .from('documents')
        .select('id, type, file_name, file_url, secure_url, file_size, created_at')
        .eq('tax_return_id', taxReturn.id)
        .order('created_at', { ascending: false });
      taxReturnDocuments = (docsData || []) as Document[];
    }

    // Get recent activity (documents, status changes)
    const { data: recentDocsData } = await db
      .from('documents')
      .select('id, type, file_name, file_url, secure_url, file_size, created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentDocuments = (recentDocsData || []) as Document[];

    // Calculate progress based on status
    let progress = 0;
    if (taxReturn) {
      switch (taxReturn.status) {
        case 'DRAFT':
          progress = 20;
          break;
        case 'IN_REVIEW':
          progress = 65;
          break;
        case 'FILED':
          progress = 90;
          break;
        case 'ACCEPTED':
          progress = 100;
          break;
        default:
          progress = 10;
      }
    }

    // Build activity feed
    const activity = recentDocuments.map((doc) => ({
      id: doc.id,
      type: 'document',
      title: 'Document Uploaded',
      description: `${doc.fileName} uploaded`,
      timestamp: doc.createdAt,
    }));

    // Add status change activity if return exists
    if (taxReturn) {
      activity.unshift({
        id: `status-${taxReturn.id}`,
        type: 'status',
        title: 'Status Updated',
        description: `Your return is ${taxReturn.status.toLowerCase().replace('_', ' ')}`,
        timestamp: taxReturn.updatedAt,
      });
    }

    // Get referral stats (by tracking code)
    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    let referralCount = 0;
    if (trackingCode) {
      const { count } = await db
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_username', trackingCode);
      referralCount = count || 0;
    }

    const response = {
      currentReturn: taxReturn
        ? {
            id: taxReturn.id,
            taxYear: taxReturn.taxYear,
            status: taxReturn.status,
            filedDate: taxReturn.filedDate,
            acceptedDate: taxReturn.acceptedDate,
            refundAmount: taxReturn.refundAmount ? Number(taxReturn.refundAmount) : undefined,
            oweAmount: taxReturn.oweAmount ? Number(taxReturn.oweAmount) : undefined,
            progress,
            documents: taxReturnDocuments.map((doc) => ({
              id: doc.id,
              type: doc.type,
              fileName: doc.fileName,
              fileUrl: doc.secureUrl,
              fileSize: doc.fileSize,
              uploadedAt: doc.createdAt,
              status: 'verified', // TODO: Add status field to document model
            })),
          }
        : null,
      recentActivity: activity.slice(0, 10),
      referralStats: {
        totalLeads: referralCount,
      },
      stats: {
        documentsCount: totalDocumentsCount || 0,
        estimatedRefund: taxReturn?.refundAmount ? Number(taxReturn.refundAmount) : 0,
        daysUntilDeadline: Math.ceil(
          (new Date(`${taxYear + 1}-04-15`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
      // Tax intake status for dashboard conditional rendering
      intakeStatus: {
        hasCompleted: !!taxIntake?.completed,
        intakeId: taxIntake?.id || null,
        taxYear: taxYear,
        currentFilingYear: currentFilingYear,
      },
      // Assigned tax preparer info
      assignedPreparer,
      // Client's document folder
      clientFolder: clientFolder
        ? {
            id: clientFolder.id,
            name: clientFolder.name,
          }
        : null,
      // Intake form summary for client to view their submitted data
      intakeSummary: taxIntake?.completed
        ? {
            personalInfo: {
              firstName: taxIntake.first_name,
              lastName: taxIntake.last_name,
              email: taxIntake.email,
              phone: taxIntake.phone,
            },
            address: {
              line1: taxIntake.address_line_1,
              line2: taxIntake.address_line_2,
              city: taxIntake.city,
              state: taxIntake.state,
              zipCode: taxIntake.zip_code,
            },
            formData: taxIntake.full_form_data,
          }
        : null,
      // User preference to hide referral program features
      hideReferralProgram: profile.hideReferralProgram ?? false,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching client dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
