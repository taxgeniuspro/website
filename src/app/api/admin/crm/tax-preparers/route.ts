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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  crmEmailAutomation: boolean;
  crmWorkflowAutomation: boolean;
  crmActivityTracking: boolean;
  crmAdvancedAnalytics: boolean;
  crmTaskManagement: boolean;
  crmLeadScoring: boolean;
  crmBulkActions: boolean;
}

interface User {
  id: string;
  email: string;
}

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
    const { data: adminProfileData } = await db.from('profiles')
      .select('role')
      .eq('userId', userId)
      .limit(1);

    const adminProfile = firstOrNull<{ role: string }>(adminProfileData);

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view tax preparer permissions' },
        { status: 403 }
      );
    }

    // Fetch all tax preparers with their permissions
    const { data: preparers, error: preparersError } = await db.from('profiles')
      .select('id, userId, firstName, lastName, crmEmailAutomation, crmWorkflowAutomation, crmActivityTracking, crmAdvancedAnalytics, crmTaskManagement, crmLeadScoring, crmBulkActions')
      .eq('role', 'tax_preparer')
      .order('lastName', { ascending: true })
      .order('firstName', { ascending: true });

    if (preparersError) {
      throw preparersError;
    }

    // Get user emails for all preparers
    const userIds = (preparers || []).map((p: Profile) => p.userId);
    const { data: users } = await db.from('users')
      .select('id, email')
      .in('id', userIds);

    const userEmailMap = new Map<string, string>();
    (users || []).forEach((u: User) => {
      userEmailMap.set(u.id, u.email);
    });

    // Format response to match TaxPreparer interface
    const formattedPreparers = (preparers || []).map((preparer: Profile) => ({
      id: preparer.id,
      userId: preparer.userId,
      firstName: preparer.firstName,
      lastName: preparer.lastName,
      email: userEmailMap.get(preparer.userId) || '',
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
