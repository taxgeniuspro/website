import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

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

    // Build where clause
    const where: any = {};

    // CRITICAL: Only show COMPLETE intake forms (full tax data with SSN, DOB, filing status)
    // Basic leads (incomplete) stay in /api/tax-preparer/leads
    where.completed = true;

    // Filter by tax year (default to current filing year, 'all' shows all years)
    if (taxYearParam !== 'all') {
      const taxYear = taxYearParam ? parseInt(taxYearParam) : getCurrentFilingTaxYear();
      where.tax_year = taxYear;
    }

    // Tax preparers can only see their own assigned intake forms
    if (isTaxPreparer) {
      // Get preparer profile ID
      const preparerProfile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!preparerProfile) {
        return NextResponse.json(
          { error: 'Tax preparer profile not found' },
          { status: 404 }
        );
      }

      where.assignedPreparerId = preparerProfile.id;
    } else if (preparerId) {
      // Admins can filter by specific preparer
      where.assignedPreparerId = preparerId;
    }

    // Filter by search term
    if (searchTerm) {
      where.OR = [
        { first_name: { contains: searchTerm, mode: 'insensitive' } },
        { last_name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
      ];
    }

    // Fetch all complete intake forms
    const intakeForms = await prisma.taxIntakeLead.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Fetch CRM contact IDs for each intake by email
    // Include assignedPreparerId to check access permissions
    const intakeEmails = intakeForms.map(i => i.email.toLowerCase());
    const crmContacts = await prisma.cRMContact.findMany({
      where: {
        email: { in: intakeEmails },
      },
      select: {
        id: true,
        email: true,
        assignedPreparerId: true,
      },
    });

    // Get current preparer's Profile ID for access check
    let currentPreparerProfileId: string | null = null;
    if (isTaxPreparer) {
      currentPreparerProfileId = where.assignedPreparerId;
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
        c.assignedPreparerId === currentPreparerProfileId;

      emailToCrmId.set(c.email.toLowerCase(), canAccess ? c.id : null);
    }

    // Determine intake status
    const getIntakeStatus = (intake: any): string => {
      // Unqualified takes precedence
      if (intake.unqualified) return 'unqualified';
      // Complete = has convertedAt timestamp (return filed)
      if (intake.convertedToClient && intake.convertedAt) return 'complete';
      if (intake.convertedToClient) return 'converted';
      if (intake.contactNotes && intake.lastContactedAt) return 'qualified';
      if (intake.lastContactedAt) return 'contacted';
      return 'new';
    };

    const intakeFormsWithStatus = intakeForms.map(intake => ({
      ...intake,
      status: getIntakeStatus(intake),
      crmContactId: emailToCrmId.get(intake.email.toLowerCase()) || null,
    }));

    // Filter by status if provided
    const filteredIntakeForms =
      statusFilter && statusFilter !== 'all'
        ? intakeFormsWithStatus.filter(intake => intake.status === statusFilter)
        : intakeFormsWithStatus;

    // Calculate stats
    const stats = {
      total: intakeForms.length,
      new: intakeFormsWithStatus.filter(i => i.status === 'new').length,
      contacted: intakeFormsWithStatus.filter(i => i.status === 'contacted').length,
      qualified: intakeFormsWithStatus.filter(i => i.status === 'qualified').length,
      converted: intakeFormsWithStatus.filter(i => i.status === 'converted').length,
      complete: intakeFormsWithStatus.filter(i => i.status === 'complete').length,
      unqualified: intakeFormsWithStatus.filter(i => i.status === 'unqualified').length,
    };

    logger.info(
      `📋 Fetched ${filteredIntakeForms.length} intake forms for ${isTaxPreparer ? 'preparer' : 'admin'} ${user.id}`
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
