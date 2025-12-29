import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

// TypeScript interfaces
interface TaxFormShare {
  id: string;
  taxFormId: string;
  shareToken: string;
  expiresAt: string | null;
  accessCount: number;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  fileUrl: string;
  fileName: string;
  downloadCount: number;
}

/**
 * GET /api/tax-forms/share/[token]
 * Access shared tax form via token
 * This route is public and doesn't require authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find share by token
    const { data: shareData, error: shareError } = await db
      .from('tax_form_shares')
      .select('id, taxFormId, shareToken, expiresAt, accessCount')
      .eq('shareToken', token)
      .limit(1);

    if (shareError) {
      logger.error('Error fetching share:', shareError);
      return NextResponse.json({ error: 'Failed to fetch share' }, { status: 500 });
    }

    const share = firstOrNull<TaxFormShare>(shareData);

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    // Check if share has expired
    if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 });
    }

    // Get tax form details
    const { data: taxFormData, error: taxFormError } = await db
      .from('tax_forms')
      .select('id, formNumber, title, fileUrl, fileName, downloadCount')
      .eq('id', share.taxFormId)
      .limit(1);

    if (taxFormError) {
      logger.error('Error fetching tax form:', taxFormError);
      return NextResponse.json({ error: 'Failed to fetch tax form' }, { status: 500 });
    }

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Update access count and last access time
    await db
      .from('tax_form_shares')
      .update({
        accessCount: share.accessCount + 1,
        lastAccessAt: new Date().toISOString(),
      })
      .eq('id', share.id);

    // Increment form download count
    await db
      .from('tax_forms')
      .update({ downloadCount: taxForm.downloadCount + 1 })
      .eq('id', taxForm.id);

    logger.info(`Tax form shared accessed: ${taxForm.formNumber} via token ${token}`);

    // Read the file
    const filePath = path.join(
      process.cwd(),
      'public',
      taxForm.fileUrl.startsWith('/') ? taxForm.fileUrl.slice(1) : taxForm.fileUrl
    );

    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Return PDF file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${taxForm.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error accessing shared tax form:', error);
    return NextResponse.json({ error: 'Failed to access shared form' }, { status: 500 });
  }
}
