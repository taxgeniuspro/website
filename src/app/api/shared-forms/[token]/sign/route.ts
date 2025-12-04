import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - must be logged in to sign' }, { status: 401 });
    }

    // Get current user's profile
    const currentUserProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get share record
    const share = await prisma.taxFormShare.findUnique({
      where: { shareToken: params.token },
      select: { id: true, taxFormId: true, sharedWith: true, expiresAt: true },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Get client tax form
    const clientTaxForm = await prisma.clientTaxForm.findFirst({
      where: {
        taxFormId: share.taxFormId,
        clientId: share.sharedWith,
      },
      select: {
        id: true,
        clientId: true,
        assignedBy: true,
        status: true,
      },
    });

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions - only client and preparer can sign
    const canSign =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin' ||
      currentUserProfile.role === 'super_admin';

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
    const existingSignature = await prisma.formSignature.findFirst({
      where: {
        clientTaxFormId: clientTaxForm.id,
        signedBy: currentUserProfile.id,
      },
    });

    if (existingSignature) {
      return NextResponse.json(
        { error: 'You have already signed this form' },
        { status: 409 }
      );
    }

    // Create signature
    const signature = await prisma.formSignature.create({
      data: {
        clientTaxFormId: clientTaxForm.id,
        signedBy: currentUserProfile.id,
        signedByRole: currentUserProfile.role,
        signatureData,
        signatureType,
        ipAddress,
        userAgent,
        consentText,
      },
    });

    // Check if both parties have signed
    const allSignatures = await prisma.formSignature.findMany({
      where: { clientTaxFormId: clientTaxForm.id },
      select: { signedBy: true, signedByRole: true },
    });

    const hasClientSignature = allSignatures.some((sig) => sig.signedBy === clientTaxForm.clientId);
    const hasPreparerSignature = allSignatures.some((sig) => sig.signedBy === clientTaxForm.assignedBy);

    // If both signed, mark as completed
    if (hasClientSignature && hasPreparerSignature && clientTaxForm.status !== 'COMPLETED') {
      await prisma.clientTaxForm.update({
        where: { id: clientTaxForm.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
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
