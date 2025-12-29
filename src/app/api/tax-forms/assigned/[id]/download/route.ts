/**
 * Filled PDF Download API
 *
 * GET /api/tax-forms/assigned/[id]/download
 * Generate and download a filled PDF with user's form data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { fillPDFForm } from '@/lib/services/pdf-form-parser.service';
import { logger } from '@/lib/logger';
import { readFile } from 'fs/promises';
import { join } from 'path';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  fileUrl: string;
  fileName: string;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  taxFormId: string;
  formData: Record<string, string | boolean> | null;
}

interface ClientPreparer {
  clientId: string;
  preparerId: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user profile
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the assignment
    const { data: assignmentData } = await db
      .from('client_tax_forms')
      .select('id, clientId, taxFormId, formData')
      .eq('id', id)
      .limit(1);

    const assignment = firstOrNull<ClientTaxForm>(assignmentData);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get tax form details
    const { data: taxFormData } = await db
      .from('tax_forms')
      .select('id, formNumber, title, fileUrl, fileName')
      .eq('id', assignment.taxFormId)
      .limit(1);

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;

    // Client can download their own form
    if (assignment.clientId === profile.id && ['client', 'lead'].includes(profile.role)) {
      hasAccess = true;
    }
    // Admin can download any form
    else if (['admin', 'admin'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can download if assigned to this client
    else if (profile.role === 'tax_preparer') {
      const { data: clientAssignmentData } = await db
        .from('client_preparers')
        .select('clientId, preparerId')
        .eq('clientId', assignment.clientId)
        .eq('preparerId', profile.id)
        .limit(1);

      if (clientAssignmentData && clientAssignmentData.length > 0) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read the original PDF
    const pdfPath = join(process.cwd(), 'public', taxForm.fileUrl);
    const pdfBuffer = await readFile(pdfPath);

    // Fill the PDF with form data
    const formData = (assignment.formData || {}) as Record<string, string | boolean>;
    const filledPDFBuffer = await fillPDFForm(pdfBuffer, formData);

    // Log download
    logger.info('Filled PDF downloaded', {
      assignmentId: id,
      formNumber: taxForm.formNumber,
      downloadedBy: profile.id,
    });

    // Return the filled PDF
    return new NextResponse(filledPDFBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${taxForm.formNumber}_Filled.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Error generating filled PDF', { error });
    return NextResponse.json({ error: 'Failed to generate filled PDF' }, { status: 500 });
  }
}
