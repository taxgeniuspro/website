/**
 * PDF Form Parse API
 *
 * GET /api/tax-forms/[id]/parse
 * Parse a PDF tax form and extract fillable fields
 * Returns field metadata for dynamic form rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePDFFormFields } from '@/lib/services/pdf-form-parser.service';
import { logger } from '@/lib/logger';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get the tax form
    const taxForm = await prisma.taxForm.findUnique({
      where: { id },
      select: {
        id: true,
        formNumber: true,
        title: true,
        fileUrl: true,
        fileName: true,
      },
    });

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Read the PDF file
    const pdfPath = join(process.cwd(), 'public', taxForm.fileUrl);
    const pdfBuffer = await readFile(pdfPath);

    // Parse the PDF form fields
    const parsedForm = await parsePDFFormFields(pdfBuffer);

    logger.info('PDF form parsed successfully', {
      formId: id,
      formNumber: taxForm.formNumber,
      totalFields: parsedForm.totalFields,
      fillableFields: parsedForm.fillableFields,
    });

    return NextResponse.json({
      formId: id,
      formNumber: taxForm.formNumber,
      title: taxForm.title,
      hasFormFields: parsedForm.formHasFields,
      totalFields: parsedForm.totalFields,
      fillableFields: parsedForm.fillableFields,
      fields: parsedForm.fields,
    });
  } catch (error) {
    logger.error('Error parsing PDF form', { error });
    return NextResponse.json({ error: 'Failed to parse PDF form' }, { status: 500 });
  }
}
