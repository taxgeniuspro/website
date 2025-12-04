import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { TaxFormCategory } from '@prisma/client';

/**
 * GET /api/tax-forms
 * List all tax forms with optional filtering
 * Query params:
 * - category: Filter by category
 * - search: Search by form number or title
 * - taxYear: Filter by tax year
 * - isActive: Filter by active status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as TaxFormCategory | null;
    const search = searchParams.get('search');
    const taxYear = searchParams.get('taxYear');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { formNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (taxYear) {
      where.taxYear = parseInt(taxYear);
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const forms = await prisma.taxForm.findMany({
      where,
      orderBy: [{ category: 'asc' }, { formNumber: 'asc' }],
      select: {
        id: true,
        formNumber: true,
        title: true,
        description: true,
        category: true,
        taxYear: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        downloadCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group by category for easier UI rendering
    const groupedForms = forms.reduce(
      (acc, form) => {
        if (!acc[form.category]) {
          acc[form.category] = [];
        }
        acc[form.category].push(form);
        return acc;
      },
      {} as Record<TaxFormCategory, typeof forms>
    );

    return NextResponse.json({
      forms,
      groupedForms,
      totalCount: forms.length,
    });
  } catch (error) {
    logger.error('Error fetching tax forms:', error);
    return NextResponse.json({ error: 'Failed to fetch tax forms' }, { status: 500 });
  }
}

/**
 * POST /api/tax-forms
 * Create a new tax form (Admin only)
 * Body:
 * - formNumber: string
 * - title: string
 * - description?: string
 * - category: TaxFormCategory
 * - taxYear: number
 * - fileUrl: string
 * - fileName: string
 * - fileSize: number
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { role: true },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { formNumber, title, description, category, taxYear, fileUrl, fileName, fileSize } = body;

    // Validate required fields
    if (!formNumber || !title || !category || !taxYear || !fileUrl || !fileName || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if form number already exists
    const existing = await prisma.taxForm.findUnique({
      where: { formNumber },
    });

    if (existing) {
      return NextResponse.json({ error: 'Form number already exists' }, { status: 409 });
    }

    const taxForm = await prisma.taxForm.create({
      data: {
        formNumber,
        title,
        description,
        category,
        taxYear,
        fileUrl,
        fileName,
        fileSize,
      },
    });

    logger.info(`Tax form created: ${formNumber} by ${userId}`);

    return NextResponse.json(taxForm, { status: 201 });
  } catch (error) {
    logger.error('Error creating tax form:', error);
    return NextResponse.json({ error: 'Failed to create tax form' }, { status: 500 });
  }
}
