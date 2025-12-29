import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
type TaxFormCategory =
  | 'INDIVIDUAL'
  | 'BUSINESS'
  | 'EMPLOYMENT'
  | 'INVESTMENT'
  | 'RETIREMENT'
  | 'REAL_ESTATE'
  | 'INTERNATIONAL'
  | 'STATE_LOCAL'
  | 'OTHER';

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description: string | null;
  category: TaxFormCategory;
  taxYear: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  role: string;
}

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

    // Build query
    let query = db
      .from('tax_forms')
      .select('id, formNumber, title, description, category, taxYear, fileUrl, fileName, fileSize, downloadCount, isActive, createdAt, updatedAt');

    if (category) {
      query = query.eq('category', category);
    }

    if (taxYear) {
      query = query.eq('taxYear', parseInt(taxYear));
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('isActive', isActive === 'true');
    }

    // Execute query with ordering
    const { data: formsData, error: formsError } = await query.order('category').order('formNumber');

    if (formsError) {
      logger.error('Error fetching tax forms:', formsError);
      return NextResponse.json({ error: 'Failed to fetch tax forms' }, { status: 500 });
    }

    let forms = (formsData || []) as TaxForm[];

    // Apply search filter (Supabase doesn't support OR with ilike easily, so we do it in JS)
    if (search) {
      const searchLower = search.toLowerCase();
      forms = forms.filter(
        (form) =>
          form.formNumber.toLowerCase().includes(searchLower) ||
          form.title.toLowerCase().includes(searchLower)
      );
    }

    // Group by category for easier UI rendering
    const groupedForms = forms.reduce(
      (acc, form) => {
        if (!acc[form.category]) {
          acc[form.category] = [];
        }
        acc[form.category].push(form);
        return acc;
      },
      {} as Record<TaxFormCategory, TaxForm[]>
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
    const { data: profileData } = await db
      .from('profiles')
      .select('role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { formNumber, title, description, category, taxYear, fileUrl, fileName, fileSize } = body;

    // Validate required fields
    if (!formNumber || !title || !category || !taxYear || !fileUrl || !fileName || !fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if form number already exists
    const { data: existingData } = await db
      .from('tax_forms')
      .select('id')
      .eq('formNumber', formNumber)
      .limit(1);

    if (existingData && existingData.length > 0) {
      return NextResponse.json({ error: 'Form number already exists' }, { status: 409 });
    }

    // Create the tax form
    const { data: taxForm, error: createError } = await db
      .from('tax_forms')
      .insert({
        formNumber,
        title,
        description,
        category,
        taxYear,
        fileUrl,
        fileName,
        fileSize,
        isActive: true,
        downloadCount: 0,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating tax form:', createError);
      return NextResponse.json({ error: 'Failed to create tax form' }, { status: 500 });
    }

    logger.info(`Tax form created: ${formNumber} by ${userId}`);

    return NextResponse.json(taxForm, { status: 201 });
  } catch (error) {
    logger.error('Error creating tax form:', error);
    return NextResponse.json({ error: 'Failed to create tax form' }, { status: 500 });
  }
}
