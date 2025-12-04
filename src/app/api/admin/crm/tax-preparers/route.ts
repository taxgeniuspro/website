/**
 * Admin CRM Tax Preparers API
 *
 * GET /api/admin/crm/tax-preparers
 * Fetches all tax preparers with their CRM permission states.
 * Admin-only endpoint.
 *
 * @module api/admin/crm/tax-preparers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/crm/tax-preparers
 *
 * Response:
 * [
 *   {
 *     "id": "profile_id",
 *     "userId": "user_id",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john@example.com",
 *     "crmEmailAutomation": false,
 *     "crmWorkflowAutomation": false,
 *     ...
 *   }
 * ]
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify admin permission
    const adminProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { role: true },
    });

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Only admins can view tax preparer permissions' },
        { status: 403 }
      );
    }

    // Fetch all tax preparers with their permissions
    const preparers = await prisma.profile.findMany({
      where: {
        role: 'tax_preparer',
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        // CRM Permissions
        crmEmailAutomation: true,
        crmWorkflowAutomation: true,
        crmActivityTracking: true,
        crmAdvancedAnalytics: true,
        crmTaskManagement: true,
        crmLeadScoring: true,
        crmBulkActions: true,
        // Get user email
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Format response to match TaxPreparer interface
    const formattedPreparers = preparers.map((preparer) => ({
      id: preparer.id,
      userId: preparer.userId,
      firstName: preparer.firstName,
      lastName: preparer.lastName,
      email: preparer.user.email || '',
      crmEmailAutomation: preparer.crmEmailAutomation,
      crmWorkflowAutomation: preparer.crmWorkflowAutomation,
      crmActivityTracking: preparer.crmActivityTracking,
      crmAdvancedAnalytics: preparer.crmAdvancedAnalytics,
      crmTaskManagement: preparer.crmTaskManagement,
      crmLeadScoring: preparer.crmLeadScoring,
      crmBulkActions: preparer.crmBulkActions,
    }));

    logger.info(`Admin ${userId} fetched ${formattedPreparers.length} tax preparers`);

    return NextResponse.json(formattedPreparers);
  } catch (error) {
    logger.error('Error fetching tax preparers:', error);
    return NextResponse.json({ error: 'Failed to fetch tax preparers' }, { status: 500 });
  }
}
