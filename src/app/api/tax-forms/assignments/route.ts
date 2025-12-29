/**
 * Tax Form Assignments Query API
 *
 * GET /api/tax-forms/assignments?formId={formId}
 * Get all assignments for a specific form (to check which clients have it)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  status: string;
  assignedAt: string;
}

interface ClientPreparer {
  clientId: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can query assignments
    if (!['tax_preparer', 'admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'Missing formId parameter' }, { status: 400 });
    }

    // Get all assignments for this form
    const { data: assignmentsData, error: assignmentsError } = await db
      .from('client_tax_forms')
      .select('id, clientId, status, assignedAt')
      .eq('taxFormId', formId);

    if (assignmentsError) {
      logger.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // For tax preparers, filter to only their clients
    if (profile.role === 'tax_preparer') {
      const { data: preparerClientsData } = await db
        .from('client_preparers')
        .select('clientId')
        .eq('preparerId', profile.id);

      const clientIds = (preparerClientsData || []).map((pc: ClientPreparer) => pc.clientId);

      return NextResponse.json({
        assignments: (assignmentsData || []).filter((a: ClientTaxForm) => clientIds.includes(a.clientId)),
      });
    }

    // Admins can see all assignments
    return NextResponse.json({ assignments: assignmentsData || [] });
  } catch (error) {
    logger.error('Error fetching tax form assignments', { error });
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
