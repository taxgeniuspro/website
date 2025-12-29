import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces (replacing Prisma types)
interface TaxFormShare {
  id: string;
  shareToken: string;
  taxFormId: string;
  sharedWith: string;
  expiresAt?: Date | null;
  accessCount: number;
  lastAccessAt?: Date | null;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description?: string | null;
  category?: string | null;
  taxYear?: number | null;
}

interface FieldDefinition {
  id: string;
  taxFormId: string;
  section: string;
  order: number;
  fieldName: string;
  fieldType: string;
}

interface ClientTaxForm {
  id: string;
  taxFormId: string;
  clientId: string;
  assignedBy: string;
  status: string;
  formData?: any;
  notes?: string | null;
  progress?: number | null;
  taxYear?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastEditedAt?: Date | null;
  lastEditedBy?: string | null;
}

interface Profile {
  id: string;
  role: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
}

interface FormSignature {
  id: string;
  clientTaxFormId: string;
  signedBy: string;
  signedByRole: string;
  signatureType: string;
  signedAt: Date;
}

/**
 * GET /api/shared-forms/[token]
 * Fetch form data by share token
 * Public endpoint - accessible with valid token
 * Records first access time and updates access count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    // Get share record
    const { data: shareData } = await db
      .from('tax_form_shares')
      .select('*')
      .eq('shareToken', resolvedParams.token)
      .single();

    if (!shareData) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    }

    const share = shareData as TaxFormShare;

    // Check if expired
    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Get tax form with field definitions
    const { data: taxFormData } = await db
      .from('tax_forms')
      .select('*')
      .eq('id', share.taxFormId)
      .single();

    const { data: fieldDefinitions } = await db
      .from('field_definitions')
      .select('*')
      .eq('taxFormId', share.taxFormId)
      .order('section', { ascending: true })
      .order('order', { ascending: true });

    // Get client tax form data
    const { data: clientTaxForms } = await db
      .from('client_tax_forms')
      .select('*')
      .eq('taxFormId', share.taxFormId)
      .eq('clientId', share.sharedWith)
      .limit(1);

    const clientTaxForm = firstOrNull(clientTaxForms) as ClientTaxForm | null;

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Get client profile
    const { data: clientData } = await db
      .from('profiles')
      .select('id, firstName, lastName, userId')
      .eq('id', clientTaxForm.clientId)
      .single();

    // Get assigned by profile
    const { data: assignedByData } = await db
      .from('profiles')
      .select('id, firstName, lastName, companyName')
      .eq('id', clientTaxForm.assignedBy)
      .single();

    // Get signatures
    const { data: signatures } = await db
      .from('form_signatures')
      .select('id, signedBy, signedByRole, signatureType, signedAt')
      .eq('clientTaxFormId', clientTaxForm.id)
      .order('signedAt', { ascending: false });

    // Get current user's profile if authenticated
    let currentUserProfile: { id: string; role: string } | null = null;
    if (userId) {
      const { data: profileData } = await db
        .from('profiles')
        .select('id, role')
        .eq('userId', userId)
        .single();
      currentUserProfile = profileData as { id: string; role: string } | null;
    }

    // Check permissions
    const canEdit =
      currentUserProfile?.id === clientTaxForm.clientId || // Client who was assigned
      currentUserProfile?.id === clientTaxForm.assignedBy || // Preparer who assigned
      currentUserProfile?.role === 'admin'; // Admin

    // Update access tracking on first access
    if (share.accessCount === 0) {
      // Increment access count
      await db
        .from('tax_form_shares')
        .update({
          accessCount: share.accessCount + 1,
          lastAccessAt: new Date().toISOString(),
        })
        .eq('id', share.id);

      // Update startedAt on client tax form if first access
      if (!clientTaxForm.startedAt) {
        await db
          .from('client_tax_forms')
          .update({ startedAt: new Date().toISOString() })
          .eq('id', clientTaxForm.id);
      }

      logger.info(`Form share first accessed: ${resolvedParams.token}`);
    } else {
      // Just increment counter
      await db
        .from('tax_form_shares')
        .update({
          accessCount: share.accessCount + 1,
          lastAccessAt: new Date().toISOString(),
        })
        .eq('id', share.id);
    }

    return NextResponse.json({
      success: true,
      clientTaxForm: {
        id: clientTaxForm.id,
        status: clientTaxForm.status,
        formData: clientTaxForm.formData,
        notes: clientTaxForm.notes,
        progress: clientTaxForm.progress,
        taxYear: clientTaxForm.taxYear,
        lastEditedAt: clientTaxForm.lastEditedAt,
        lastEditedBy: clientTaxForm.lastEditedBy,
        isLocked: clientTaxForm.status === 'REVIEWED', // Locked after review
      },
      taxForm: {
        id: taxFormData?.id,
        formNumber: taxFormData?.formNumber,
        title: taxFormData?.title,
        description: taxFormData?.description,
        category: taxFormData?.category,
        taxYear: taxFormData?.taxYear,
        fieldDefinitions: fieldDefinitions || [],
      },
      client: {
        id: clientData?.id,
        name: `${clientData?.firstName || ''} ${clientData?.lastName || ''}`.trim(),
      },
      preparer: {
        id: assignedByData?.id,
        name: `${assignedByData?.firstName || ''} ${assignedByData?.lastName || ''}`.trim(),
        company: assignedByData?.companyName,
      },
      signatures: signatures || [],
      permissions: {
        canEdit,
        canSign: canEdit && clientTaxForm.status !== 'REVIEWED',
      },
    });
  } catch (error) {
    logger.error('Error fetching shared form:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

/**
 * PATCH /api/shared-forms/[token]
 * Save form edits (auto-save)
 * Body:
 * - formData: object - Updated form data
 * - progress?: number - Form completion percentage (0-100)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentUserProfile } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .single();

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get share record
    const { data: share } = await db
      .from('tax_form_shares')
      .select('id, taxFormId, sharedWith, expiresAt')
      .eq('shareToken', resolvedParams.token)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Get client tax form
    const { data: clientTaxForms } = await db
      .from('client_tax_forms')
      .select('id, clientId, assignedBy, status, formData')
      .eq('taxFormId', share.taxFormId)
      .eq('clientId', share.sharedWith)
      .limit(1);

    const clientTaxForm = firstOrNull(clientTaxForms);

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions
    const canEdit =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin';

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this form' }, { status: 403 });
    }

    // Check if form is locked
    if (clientTaxForm.status === 'REVIEWED') {
      return NextResponse.json({ error: 'Form is locked after review' }, { status: 423 });
    }

    const body = await request.json();
    const { formData, progress } = body;

    if (!formData) {
      return NextResponse.json({ error: 'Missing formData' }, { status: 400 });
    }

    // Detect field changes for audit trail
    const oldFormData = (clientTaxForm.formData as any) || {};
    const fieldChanges: any = {};

    for (const [key, newValue] of Object.entries(formData)) {
      const oldValue = oldFormData[key];
      if (oldValue !== newValue) {
        fieldChanges[key] = { old: oldValue, new: newValue };
      }
    }

    // Update client tax form
    const updateData: any = {
      formData,
      lastEditedBy: currentUserProfile.id,
      lastEditedAt: new Date().toISOString(),
      status: clientTaxForm.status === 'ASSIGNED' ? 'IN_PROGRESS' : clientTaxForm.status,
    };
    if (progress !== undefined) {
      updateData.progress = progress;
    }

    const { data: updated, error: updateError } = await db
      .from('client_tax_forms')
      .update(updateData)
      .eq('id', clientTaxForm.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create audit trail entry if there are changes
    if (Object.keys(fieldChanges).length > 0) {
      await db
        .from('tax_form_edits')
        .insert({
          clientTaxFormId: clientTaxForm.id,
          editedBy: currentUserProfile.id,
          editedByRole: currentUserProfile.role,
          fieldChanges,
          formDataSnapshot: formData,
        });
    }

    logger.info(`Form updated: ${clientTaxForm.id} by ${currentUserProfile.id}`);

    return NextResponse.json({
      success: true,
      lastEditedAt: updated?.lastEditedAt,
      progress: updated?.progress,
      status: updated?.status,
    });
  } catch (error) {
    logger.error('Error saving form:', error);
    return NextResponse.json({ error: 'Failed to save form' }, { status: 500 });
  }
}
