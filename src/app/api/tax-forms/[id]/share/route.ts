import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  userId: string;
  trackingCode: string | null;
  customTrackingCode: string | null;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  taxYear: number;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  taxFormId: string;
  taxYear: number;
  status: string;
}

interface User {
  id: string;
  email: string;
}

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
    const { data: preparerData } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .limit(1);

    const preparer = firstOrNull<Profile>(preparerData);

    if (!preparer || (preparer.role !== 'tax_preparer' && preparer.role !== 'admin' && preparer.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Tax preparer access required' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, taxYear, notes, expiresInDays = 30 } = body;

    // Validate required fields
    if (!clientId || !taxYear) {
      return NextResponse.json({ error: 'Missing required fields: clientId, taxYear' }, { status: 400 });
    }

    // Get the tax form
    const { data: taxFormData } = await db
      .from('tax_forms')
      .select('id, formNumber, title, taxYear')
      .eq('id', id)
      .limit(1);

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Verify client exists
    const { data: clientData } = await db
      .from('profiles')
      .select('id, firstName, lastName, userId')
      .eq('id', clientId)
      .limit(1);

    const client = firstOrNull<Profile>(clientData);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get client's user for pre-filling data
    const { data: clientUserData } = await db
      .from('users')
      .select('email')
      .eq('id', client.userId)
      .limit(1);

    const clientUser = firstOrNull<User>(clientUserData);

    // Auto-fill form data with client info
    const initialFormData = {
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      email: clientUser?.email || '',
      // Add more fields from profile as needed
    };

    // Check if form assignment already exists
    const { data: existingAssignmentData } = await db
      .from('client_tax_forms')
      .select('id, clientId, taxFormId, taxYear, status')
      .eq('clientId', clientId)
      .eq('taxFormId', id)
      .eq('taxYear', taxYear)
      .limit(1);

    let clientTaxForm = firstOrNull<ClientTaxForm>(existingAssignmentData);

    // Create or update the client tax form
    if (!clientTaxForm) {
      const { data: newAssignment, error: createError } = await db
        .from('client_tax_forms')
        .insert({
          clientId,
          taxFormId: id,
          assignedBy: preparer.id,
          taxYear,
          notes,
          formData: initialFormData,
          status: 'ASSIGNED',
        })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating client tax form:', createError);
        return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
      }

      clientTaxForm = newAssignment;
      logger.info(`Tax form ${taxForm.formNumber} assigned to client ${clientId} for tax year ${taxYear}`);
    }

    // Generate unique share token
    const shareToken = nanoid(32);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create shareable link
    const { error: shareError } = await db
      .from('tax_form_shares')
      .insert({
        taxFormId: id,
        sharedBy: preparer.id,
        sharedWith: clientId,
        shareToken,
        expiresAt: expiresAt.toISOString(),
      });

    if (shareError) {
      logger.error('Error creating share:', shareError);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    // Get preparer's tracking code to include in share URL
    const { data: preparerProfileData } = await db
      .from('profiles')
      .select('trackingCode, customTrackingCode')
      .eq('id', preparer.id)
      .limit(1);

    const preparerProfile = firstOrNull<Profile>(preparerProfileData);
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
