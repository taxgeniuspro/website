import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

// Map form categories to DocumentType enum
const CATEGORY_TO_TYPE: Record<string, string> = {
  w2: 'W2',
  '1099': 'FORM_1099',
  receipts: 'RECEIPT',
  mortgage: 'OTHER',
  other: 'OTHER',
};

/**
 * POST /api/tax-preparer/documents/upload
 * Upload a document on behalf of a client
 * Only for assigned clients
 *
 * Required form fields:
 * - file: The file to upload
 * - clientId: The client's profile ID
 * - category: Document category
 * - taxYear: Tax year for the document
 *
 * Optional fields:
 * - status: Document status (defaults to REVIEWED since preparer is uploading)
 * - reviewNotes: Notes about the document
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'TAX_PREPARER' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string;
    const category = formData.get('category') as string;
    const taxYearStr = formData.get('taxYear') as string;
    const status = (formData.get('status') as string) || 'REVIEWED';
    const reviewNotes = formData.get('reviewNotes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    if (!taxYearStr) {
      return NextResponse.json({ error: 'Tax year is required' }, { status: 400 });
    }

    const taxYear = parseInt(taxYearStr);

    // Verify client exists
    const client = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true, role: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    // Check if preparer has access to this client
    if (role === 'TAX_PREPARER') {
      const hasAccess = await prisma.clientPreparer.findFirst({
        where: {
          clientId: clientId,
          preparerId: profile.id,
          isActive: true,
        },
      });

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this client.' },
          { status: 403 }
        );
      }
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory with year subfolder: /uploads/documents/{clientId}/{taxYear}/
    const uploadDir = join(process.cwd(), 'uploads', 'documents', clientId, taxYear.toString());
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Validate status
    const validStatuses = ['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'PROCESSING'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        profileId: clientId,
        type: CATEGORY_TO_TYPE[category] || 'OTHER',
        fileName: file.name,
        fileUrl: `/uploads/documents/${clientId}/${taxYear}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        isEncrypted: false,
        taxYear: taxYear,
        status: status as any,
        reviewedBy: profile.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        metadata: {
          category,
          uploadedAt: new Date().toISOString(),
          uploadedBy: profile.id,
          uploaderRole: 'TAX_PREPARER',
        },
      },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      `Tax preparer ${profile.id} uploaded document ${document.id} for client ${clientId}`
    );

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize,
        taxYear: document.taxYear,
        status: document.status,
        category,
        client: {
          id: document.profile.id,
          name: `${document.profile.firstName || ''} ${document.profile.lastName || ''}`.trim(),
          email: document.profile.email,
        },
      },
    });
  } catch (error) {
    logger.error('Error uploading document for client:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
