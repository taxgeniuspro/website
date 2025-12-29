import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

// TypeScript interface for TaxForm
interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  fileUrl: string;
  fileName: string;
  isActive: boolean;
}

/**
 * POST /api/tax-forms/bulk-download
 * Download multiple tax forms as a ZIP file
 * Body:
 * - formIds: string[] - Array of tax form IDs to download
 * - zipName?: string - Optional custom name for ZIP file
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { formIds, zipName } = body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json({ error: 'formIds must be a non-empty array' }, { status: 400 });
    }

    // Get all requested forms
    const { data: formsData, error: formsError } = await db
      .from('tax_forms')
      .select('id, formNumber, title, fileUrl, fileName, isActive')
      .in('id', formIds)
      .eq('isActive', true);

    if (formsError) {
      logger.error('Error fetching tax forms:', formsError);
      return NextResponse.json({ error: 'Failed to fetch tax forms' }, { status: 500 });
    }

    const forms = (formsData || []) as TaxForm[];

    if (forms.length === 0) {
      return NextResponse.json({ error: 'No active forms found' }, { status: 404 });
    }

    // Update download counts for all forms
    for (const form of forms) {
      // Get current download count first
      const { data: currentForm } = await db
        .from('tax_forms')
        .select('downloadCount')
        .eq('id', form.id)
        .single();

      if (currentForm) {
        await db
          .from('tax_forms')
          .update({ downloadCount: (currentForm.downloadCount || 0) + 1 })
          .eq('id', form.id);
      }
    }

    logger.info(`Bulk download: ${forms.length} forms by ${userId}`);

    // Create a buffer to write the ZIP file to memory
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    const chunks: Buffer[] = [];

    // Collect data chunks
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Add each form to the archive
    for (const form of forms) {
      const filePath = path.join(
        process.cwd(),
        'public',
        form.fileUrl.startsWith('/') ? form.fileUrl.slice(1) : form.fileUrl
      );

      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        archive.append(fileBuffer, { name: form.fileName });
      } else {
        logger.warn(`File not found for bulk download: ${filePath}`);
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for all chunks to be collected
    const zipBuffer = await new Promise<Buffer>((resolve) => {
      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Generate ZIP filename
    const defaultZipName = `TaxForms_${forms.length}_Forms_${new Date().toISOString().split('T')[0]}.zip`;
    const finalZipName = zipName || defaultZipName;

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${finalZipName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error creating bulk download:', error);
    return NextResponse.json({ error: 'Failed to create bulk download' }, { status: 500 });
  }
}
