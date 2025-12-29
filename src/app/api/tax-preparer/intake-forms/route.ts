import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

// Local type definitions
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface TaxIntakeLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  tax_year: number;
  completed: boolean;
  convertedToClient: boolean;
  convertedAt: string | null;
  lastContactedAt: string | null;
  contactNotes: string | null;
  unqualified: boolean;
  assignedPreparerId: string | null;
  profileId: string | null;
  created_at: string;
}

interface CRMContact {
  id: string;
  email: string;
  assignedPreparerId: string | null;
}

/**
 * GET /api/tax-preparer/intake-forms
 * Fetches COMPLETE TaxIntakeLead records (intake forms with SSN, DOB, filing status)
 * These are ready-to-file clients from full intake form submissions
 *
 * Query params:
 *  - preparerId: Filter by assigned preparer (optional, defaults to current user)
 *  - status: Filter by intake status (new, contacted, converted, all)
 *  - search: Search by name, email, or phone
 *  - taxYear: Filter by tax year (optional, defaults to current filing year, use 'all' for all years)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access intake forms' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const preparerId = searchParams.get('preparerId');
    const statusFilter = searchParams.get('status');
    const searchTerm = searchParams.get('search');
    const taxYearParam = searchParams.get('taxYear');

    // Get preparer profile ID if needed
    let preparerProfileId: string | null = null;
    if (isTaxPreparer) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id')
        .eq('userId', user.id)
        .limit(1);

      const preparerProfile = firstOrNull(profiles);

      if (!preparerProfile) {
        return NextResponse.json(
          { error: 'Tax preparer profile not found' },
          { status: 404 }
        );
      }
      preparerProfileId = preparerProfile.id;
    }

    // Build query for complete intake forms
    let query = db
      .from('tax_intake_leads')
      .select('*')
      .eq('completed', true);

    // Filter by tax year (default to current filing year, 'all' shows all years)
    if (taxYearParam !== 'all') {
      const taxYear = taxYearParam ? parseInt(taxYearParam) : getCurrentFilingTaxYear();
      query = query.eq('tax_year', taxYear);
    }

    // Tax preparers can only see their own assigned intake forms
    if (isTaxPreparer && preparerProfileId) {
      query = query.eq('assignedPreparerId', preparerProfileId);
    } else if (preparerId) {
      // Admins can filter by specific preparer
      query = query.eq('assignedPreparerId', preparerId);
    }

    // Filter by search term
    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
      );
    }

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data: intakeForms, error: formsError } = await query;

    if (formsError) {
      throw new Error(formsError.message);
    }

    // Get profile info for linked profiles
    const profileIds = (intakeForms || [])
      .map((f: TaxIntakeLead) => f.profileId)
      .filter(Boolean);

    let profileMap = new Map<string, Profile>();
    if (profileIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, firstName, lastName, role')
        .in('id', profileIds);

      for (const p of profiles || []) {
        profileMap.set(p.id, p);
      }
    }

    // Fetch CRM contact IDs for each intake by email
    const intakeEmails = (intakeForms || []).map((i: TaxIntakeLead) => i.email.toLowerCase());
    let crmContacts: CRMContact[] = [];

    if (intakeEmails.length > 0) {
      const { data: contacts } = await db
        .from('crm_contacts')
        .select('id, email, assignedPreparerId')
        .in('email', intakeEmails);
      crmContacts = contacts || [];
    }

    // Create email -> CRM contact ID map (only if preparer has access)
    const emailToCrmId = new Map<string, string | null>();
    for (const c of crmContacts) {
      // Only include CRM contact ID if:
      // - User is admin, OR
      // - CRM contact has no assigned preparer, OR
      // - CRM contact is assigned to current preparer
      const canAccess =
        isAdmin ||
        !c.assignedPreparerId ||
        c.assignedPreparerId === preparerProfileId;

      emailToCrmId.set(c.email.toLowerCase(), canAccess ? c.id : null);
    }

    // Determine intake status
    const getIntakeStatus = (intake: TaxIntakeLead): string => {
      // Unqualified takes precedence
      if (intake.unqualified) return 'unqualified';
      // Complete = has convertedAt timestamp (return filed)
      if (intake.convertedToClient && intake.convertedAt) return 'complete';
      if (intake.convertedToClient) return 'converted';
      if (intake.contactNotes && intake.lastContactedAt) return 'qualified';
      if (intake.lastContactedAt) return 'contacted';
      return 'new';
    };

    const intakeFormsWithStatus = (intakeForms || []).map((intake: TaxIntakeLead) => ({
      ...intake,
      status: getIntakeStatus(intake),
      crmContactId: emailToCrmId.get(intake.email.toLowerCase()) || null,
      profile: intake.profileId ? profileMap.get(intake.profileId) || null : null,
    }));

    // Filter by status if provided
    const filteredIntakeForms =
      statusFilter && statusFilter !== 'all'
        ? intakeFormsWithStatus.filter((intake: { status: string }) => intake.status === statusFilter)
        : intakeFormsWithStatus;

    // Calculate stats
    const stats = {
      total: intakeForms?.length || 0,
      new: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'new').length,
      contacted: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'contacted').length,
      qualified: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'qualified').length,
      converted: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'converted').length,
      complete: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'complete').length,
      unqualified: intakeFormsWithStatus.filter((i: { status: string }) => i.status === 'unqualified').length,
    };

    logger.info(
      `Fetched ${filteredIntakeForms.length} intake forms for ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
    );

    return NextResponse.json({
      success: true,
      intakeForms: filteredIntakeForms,
      stats,
      currentFilingYear: getCurrentFilingTaxYear(),
    });
  } catch (error) {
    logger.error('Error fetching tax preparer intake forms:', error);
    return NextResponse.json({ error: 'Failed to fetch intake forms' }, { status: 500 });
  }
}
