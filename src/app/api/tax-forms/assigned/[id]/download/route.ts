/**
 * Filled PDF Download API
 *
 * GET /api/tax-forms/assigned/[id]/download
 * Generate and download a filled PDF with user's form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fillPDFForm } from '@/lib/services/pdf-form-parser.service';
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

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the assignment with tax form details
    const assignment = await prisma.clientTaxForm.findUnique({
      where: { id },
      include: {
        taxForm: {
          select: {
            id: true,
            formNumber: true,
            title: true,
            fileUrl: true,
            fileName: true,
          },
        },
        client: {
          select: { id: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;

    // Client can download their own form
    if (assignment.clientId === profile.id && ['CLIENT', 'LEAD'].includes(profile.role)) {
      hasAccess = true;
    }
    // Admin can download any form
    else if (['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can download if assigned to this client
    else if (profile.role === 'TAX_PREPARER') {
      const clientAssignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId: assignment.clientId,
          preparerId: profile.id,
        },
      });

      if (clientAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read the original PDF
    const pdfPath = join(process.cwd(), 'public', assignment.taxForm.fileUrl);
    const pdfBuffer = await readFile(pdfPath);

    // Fill the PDF with form data
    const formData = (assignment.formData || {}) as Record<string, string | boolean>;
    const filledPDFBuffer = await fillPDFForm(pdfBuffer, formData);

    // Log download
    logger.info('Filled PDF downloaded', {
      assignmentId: id,
      formNumber: assignment.taxForm.formNumber,
      downloadedBy: profile.id,
    });

    // Return the filled PDF
    return new NextResponse(filledPDFBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${assignment.taxForm.formNumber}_Filled.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Error generating filled PDF', { error });
    return NextResponse.json({ error: 'Failed to generate filled PDF' }, { status: 500 });
  }
}
