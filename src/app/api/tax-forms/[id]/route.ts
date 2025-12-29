import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description: string | null;
  category: string;
  taxYear: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaxFormShare {
  id: string;
  sharedWith: string;
  shareToken: string;
  createdAt: string;
  accessCount: number;
}

interface Profile {
  id: string;
  role: string;
}

/**
 * GET /api/tax-forms/[id]
 * Get single tax form details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get tax form
    const { data: taxFormData, error: taxFormError } = await db
      .from('tax_forms')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (taxFormError) {
      logger.error('Error fetching tax form:', taxFormError);
      return NextResponse.json({ error: 'Failed to fetch tax form' }, { status: 500 });
    }

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    // Get shares for this form
    const { data: sharesData } = await db
      .from('tax_form_shares')
      .select('id, sharedWith, shareToken, createdAt, accessCount')
      .eq('taxFormId', id)
      .order('createdAt', { ascending: false })
      .limit(10);

    const shares = (sharesData || []) as TaxFormShare[];

    return NextResponse.json({ ...taxForm, shares });
  } catch (error) {
    logger.error('Error fetching tax form:', error);
    return NextResponse.json({ error: 'Failed to fetch tax form' }, { status: 500 });
  }
}

/**
 * PATCH /api/tax-forms/[id]
 * Update tax form (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await request.json();

    const { data: updatedData, error: updateError } = await db
      .from('tax_forms')
      .update({ ...body, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating tax form:', updateError);
      return NextResponse.json({ error: 'Failed to update tax form' }, { status: 500 });
    }

    logger.info(`Tax form updated: ${updatedData.formNumber} by ${userId}`);

    return NextResponse.json(updatedData);
  } catch (error) {
    logger.error('Error updating tax form:', error);
    return NextResponse.json({ error: 'Failed to update tax form' }, { status: 500 });
  }
}

/**
 * DELETE /api/tax-forms/[id]
 * Delete tax form (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const { error: deleteError } = await db
      .from('tax_forms')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting tax form:', deleteError);
      return NextResponse.json({ error: 'Failed to delete tax form' }, { status: 500 });
    }

    logger.info(`Tax form deleted: ${id} by ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting tax form:', error);
    return NextResponse.json({ error: 'Failed to delete tax form' }, { status: 500 });
  }
}
