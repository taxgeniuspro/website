import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/shared-forms/[token]/sign
 * Submit e-signature for a form
 * Body:
 * - signatureData: string - Base64 encoded signature image
 * - signatureType: string - "drawn", "typed", or "uploaded"
 * - consentText: string - What the user agreed to when signing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - must be logged in to sign' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentUserProfile } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
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
      .select('id, clientId, assignedBy, status')
      .eq('taxFormId', share.taxFormId)
      .eq('clientId', share.sharedWith)
      .limit(1);

    const clientTaxForm = firstOrNull(clientTaxForms);

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions - only client and preparer can sign
    const canSign =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin';

    if (!canSign) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to sign this form' }, { status: 403 });
    }

    // Check if form is locked
    if (clientTaxForm.status === 'REVIEWED') {
      return NextResponse.json({ error: 'Form is already finalized and locked' }, { status: 423 });
    }

    const body = await request.json();
    const { signatureData, signatureType, consentText } = body;

    if (!signatureData || !signatureType || !consentText) {
      return NextResponse.json(
        { error: 'Missing required fields: signatureData, signatureType, consentText' },
        { status: 400 }
      );
    }

    // Validate signature type
    if (!['drawn', 'typed', 'uploaded'].includes(signatureType)) {
      return NextResponse.json(
        { error: 'Invalid signatureType. Must be: drawn, typed, or uploaded' },
        { status: 400 }
      );
    }

    // Get IP address and user agent for security tracking
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if this user already signed this form
    const { data: existingSignatures } = await db
      .from('form_signatures')
      .select('id')
      .eq('clientTaxFormId', clientTaxForm.id)
      .eq('signedBy', currentUserProfile.id)
      .limit(1);

    if (existingSignatures && existingSignatures.length > 0) {
      return NextResponse.json(
        { error: 'You have already signed this form' },
        { status: 409 }
      );
    }

    // Create signature
    const { data: signature, error: signatureError } = await db
      .from('form_signatures')
      .insert({
        clientTaxFormId: clientTaxForm.id,
        signedBy: currentUserProfile.id,
        signedByRole: currentUserProfile.role,
        signatureData,
        signatureType,
        ipAddress,
        userAgent,
        consentText,
      })
      .select()
      .single();

    if (signatureError || !signature) {
      throw new Error(`Failed to create signature: ${signatureError?.message}`);
    }

    // Check if both parties have signed
    const { data: allSignatures } = await db
      .from('form_signatures')
      .select('signedBy, signedByRole')
      .eq('clientTaxFormId', clientTaxForm.id);

    const hasClientSignature = (allSignatures || []).some((sig: any) => sig.signedBy === clientTaxForm.clientId);
    const hasPreparerSignature = (allSignatures || []).some((sig: any) => sig.signedBy === clientTaxForm.assignedBy);

    // If both signed, mark as completed
    if (hasClientSignature && hasPreparerSignature && clientTaxForm.status !== 'COMPLETED') {
      await db
        .from('client_tax_forms')
        .update({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        })
        .eq('id', clientTaxForm.id);
    }

    logger.info(`Form signed: ${clientTaxForm.id} by ${currentUserProfile.firstName} ${currentUserProfile.lastName} (${currentUserProfile.role})`);

    return NextResponse.json({
      success: true,
      signature: {
        id: signature.id,
        signedBy: signature.signedBy,
        signedByRole: signature.signedByRole,
        signatureType: signature.signatureType,
        signedAt: signature.signedAt,
      },
      formStatus: hasClientSignature && hasPreparerSignature ? 'COMPLETED' : 'IN_PROGRESS',
      needsSignatures: {
        client: !hasClientSignature,
        preparer: !hasPreparerSignature,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating signature:', error);
    return NextResponse.json({ error: 'Failed to create signature' }, { status: 500 });
  }
}
