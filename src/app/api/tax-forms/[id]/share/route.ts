import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

/**
 * POST /api/tax-forms/[id]/share
 * Create a shareable link for a tax form
 * Body:
 * - clientId: string - Profile ID of client to share with
 * - taxYear: number - Tax year for this form
 * - notes?: string - Instructions for client
 * - expiresInDays?: number - Days until link expires (default: 30)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const preparer = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!preparer || (preparer.role !== 'tax_preparer' && preparer.role !== 'admin' && preparer.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Tax preparer access required' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, taxYear, notes, expiresInDays = 30 } = body;

    // Validate required fields
    if (!clientId || !taxYear) {
      return NextResponse.json({ error: 'Missing required fields: clientId, taxYear' }, { status: 400 });
    }

    // Get the tax form
    const taxForm = await prisma.taxForm.findUnique({
      where: { id },
      select: { id: true, formNumber: true, title: true, taxYear: true },
    });

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Verify client exists
    const client = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, userId: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's user for pre-filling data
    const clientUser = await prisma.user.findUnique({
      where: { id: client.userId },
      select: { email: true },
    });

    // Auto-fill form data with client info
    const initialFormData = {
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      email: clientUser?.email || '',
      // Add more fields from profile as needed
    };

    // Check if form assignment already exists
    let clientTaxForm = await prisma.clientTaxForm.findUnique({
      where: {
        clientId_taxFormId_taxYear: {
          clientId,
          taxFormId: id,
          taxYear,
        },
      },
      include: { shares: true },
    });

    // Create or update the client tax form
    if (!clientTaxForm) {
      clientTaxForm = await prisma.clientTaxForm.create({
        data: {
          clientId,
          taxFormId: id,
          assignedBy: preparer.id,
          taxYear,
          notes,
          formData: initialFormData, // Pre-fill with client data
          status: 'ASSIGNED',
        },
        include: { shares: true },
      });

      logger.info(`Tax form ${taxForm.formNumber} assigned to client ${clientId} for tax year ${taxYear}`);
    }

    // Generate unique share token
    const shareToken = nanoid(32);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create shareable link
    const share = await prisma.taxFormShare.create({
      data: {
        taxFormId: id,
        sharedBy: preparer.id,
        sharedWith: clientId,
        shareToken,
        expiresAt,
      },
    });

    // Get preparer's tracking code to include in share URL
    const preparerProfile = await prisma.profile.findUnique({
      where: { id: preparer.id },
      select: {
        trackingCode: true,
        customTrackingCode: true,
      },
    });

    const trackingCode = preparerProfile?.customTrackingCode || preparerProfile?.trackingCode;

    // Build shareable URL with tracking code
    const baseUrl = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';
    let shareUrl = `${baseUrl}/shared-forms/${shareToken}`;

    // Append tracking code if available
    if (trackingCode) {
      shareUrl += `?ref=${trackingCode}`;
    }

    logger.info(`Tax form share link created: ${shareToken} for client ${clientId} with tracking: ${trackingCode || 'none'}`);

    return NextResponse.json({
      success: true,
      clientTaxFormId: clientTaxForm.id,
      shareToken,
      shareUrl,
      expiresAt,
      trackingCode: trackingCode || null,
      form: {
        id: taxForm.id,
        formNumber: taxForm.formNumber,
        title: taxForm.title,
      },
      client: {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating tax form share link:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
