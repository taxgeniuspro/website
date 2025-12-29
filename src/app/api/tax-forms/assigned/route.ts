/**
 * Client Tax Forms API
 *
 * GET /api/tax-forms/assigned
 * Get all tax forms assigned to the authenticated client
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description: string | null;
  category: string;
  taxYear: number;
  fileUrl: string;
  fileName: string;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  taxFormId: string;
  assignedBy: string;
  status: string;
  progress: number;
  notes: string | null;
  formData: Record<string, unknown> | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastEditedAt: string | null;
}

/**
 * GET - Get all forms assigned to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only clients and leads can access this endpoint
    if (!['client', 'lead'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is for clients only' },
        { status: 403 }
      );
    }

    // Get all forms assigned to this client
    const { data: assignmentsData, error: assignmentsError } = await db
      .from('client_tax_forms')
      .select('*')
      .eq('clientId', profile.id)
      .order('assignedAt', { ascending: false });

    if (assignmentsError) {
      logger.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assigned forms' }, { status: 500 });
    }

    // Get tax form details for each assignment
    const taxFormIds = [...new Set((assignmentsData || []).map((a: any) => a.taxFormId))];
    const { data: taxFormsData } = await db
      .from('tax_forms')
      .select('id, formNumber, title, description, category, taxYear, fileUrl, fileName')
      .in('id', taxFormIds);

    const taxFormsMap = new Map((taxFormsData || []).map((t: any) => [t.id, t]));

    // Get assigner profile details
    const assignerIds = [...new Set((assignmentsData || []).map((a: any) => a.assignedBy).filter(Boolean))];
    const { data: assignersData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', assignerIds);

    const assignersMap = new Map((assignersData || []).map((a: any) => [a.id, a]));

    return NextResponse.json({
      assignments: (assignmentsData || []).map((a: any) => {
        const taxForm = taxFormsMap.get(a.taxFormId);
        const assigner = assignersMap.get(a.assignedBy);
        return {
          id: a.id,
          status: a.status,
          progress: a.progress,
          notes: a.notes,
          formData: a.formData,
          assignedAt: a.assignedAt,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          lastEditedAt: a.lastEditedAt,
          taxForm: taxForm || null,
          assignedBy: {
            name: assigner ? `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() : 'Unknown',
          },
        };
      }),
    });
  } catch (error) {
    logger.error('Error fetching assigned tax forms', { error });
    return NextResponse.json({ error: 'Failed to fetch assigned forms' }, { status: 500 });
  }
}
