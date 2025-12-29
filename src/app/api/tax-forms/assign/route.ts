/**
 * Tax Form Assignment API
 *
 * POST /api/tax-forms/assign
 * Assign a tax form to a client (Tax Preparer or Admin only)
 *
 * GET /api/tax-forms/assign?clientId={clientId}
 * Get all form assignments for a client (Tax Preparer or Admin only)
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
  category: string;
  taxYear: number;
  fileUrl: string;
  isActive: boolean;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  taxFormId: string;
  status: string;
  progress: number;
  notes: string | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastEditedAt: string | null;
}

interface ClientPreparer {
  clientId: string;
  preparerId: string;
}

/**
 * POST - Assign a tax form to a client
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can assign forms
    if (!['tax_preparer', 'admin', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only tax preparers and admins can assign forms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clientId, taxFormId, notes } = body;

    if (!clientId || !taxFormId) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, taxFormId' },
        { status: 400 }
      );
    }

    // Verify client exists and has CLIENT or LEAD role
    const { data: clientData } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .eq('id', clientId)
      .limit(1);

    const client = firstOrNull<Profile>(clientData);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!['client', 'lead'].includes(client.role)) {
      return NextResponse.json({ error: 'Target user must be a client or lead' }, { status: 400 });
    }

    // Verify tax form exists
    const { data: taxFormData } = await db
      .from('tax_forms')
      .select('id, formNumber, title, category, taxYear, isActive')
      .eq('id', taxFormId)
      .limit(1);

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    if (!taxForm.isActive) {
      return NextResponse.json({ error: 'Tax form is not active' }, { status: 400 });
    }

    // Check if form is already assigned
    const { data: existingData } = await db
      .from('client_tax_forms')
      .select('id')
      .eq('clientId', clientId)
      .eq('taxFormId', taxFormId)
      .limit(1);

    if (existingData && existingData.length > 0) {
      return NextResponse.json(
        { error: 'Form is already assigned to this client' },
        { status: 409 }
      );
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'tax_preparer') {
      const { data: assignmentData } = await db
        .from('client_preparers')
        .select('clientId, preparerId')
        .eq('clientId', clientId)
        .eq('preparerId', profile.id)
        .limit(1);

      if (!assignmentData || assignmentData.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Create the assignment
    const { data: clientTaxForm, error: createError } = await db
      .from('client_tax_forms')
      .insert({
        clientId,
        taxFormId,
        assignedBy: profile.id,
        notes,
        status: 'ASSIGNED',
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating assignment:', createError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    logger.info('Tax form assigned to client', {
      clientTaxFormId: clientTaxForm.id,
      clientId,
      taxFormId,
      assignedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      assignment: {
        ...clientTaxForm,
        taxForm: {
          formNumber: taxForm.formNumber,
          title: taxForm.title,
          category: taxForm.category,
          taxYear: taxForm.taxYear,
        },
        client: {
          firstName: client.firstName,
          lastName: client.lastName,
        },
      },
    });
  } catch (error) {
    logger.error('Error assigning tax form', { error });
    return NextResponse.json({ error: 'Failed to assign tax form' }, { status: 500 });
  }
}

/**
 * GET - Get all form assignments for a client
 */
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

    // Only tax preparers and admins can view assignments
    if (!['tax_preparer', 'admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'tax_preparer') {
      const { data: assignmentData } = await db
        .from('client_preparers')
        .select('clientId, preparerId')
        .eq('clientId', clientId)
        .eq('preparerId', profile.id)
        .limit(1);

      if (!assignmentData || assignmentData.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Get all assignments for this client
    const { data: assignmentsData, error: assignmentsError } = await db
      .from('client_tax_forms')
      .select('*')
      .eq('clientId', clientId)
      .order('assignedAt', { ascending: false });

    if (assignmentsError) {
      logger.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // Get tax form details for each assignment
    const taxFormIds = [...new Set(assignmentsData.map((a: any) => a.taxFormId))];
    const { data: taxFormsData } = await db
      .from('tax_forms')
      .select('id, formNumber, title, category, taxYear, fileUrl')
      .in('id', taxFormIds);

    const taxFormsMap = new Map((taxFormsData || []).map((t: any) => [t.id, t]));

    // Get assigner profile details
    const assignerIds = [...new Set(assignmentsData.map((a: any) => a.assignedBy).filter(Boolean))];
    const { data: assignersData } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', assignerIds);

    const assignersMap = new Map((assignersData || []).map((a: any) => [a.id, a]));

    return NextResponse.json({
      assignments: assignmentsData.map((a: any) => {
        const taxForm = taxFormsMap.get(a.taxFormId);
        const assigner = assignersMap.get(a.assignedBy);
        return {
          id: a.id,
          status: a.status,
          progress: a.progress,
          notes: a.notes,
          assignedAt: a.assignedAt,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          lastEditedAt: a.lastEditedAt,
          taxForm: taxForm || null,
          assignedBy: assigner ? { firstName: assigner.firstName, lastName: assigner.lastName } : null,
        };
      }),
    });
  } catch (error) {
    logger.error('Error fetching tax form assignments', { error });
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
