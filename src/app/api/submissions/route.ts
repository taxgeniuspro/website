import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  userId: string;
  supabaseUserId?: string | null;
  email?: string | null;
}

interface TaxReturn {
  id: string;
  profileId: string;
  taxYear: number;
  status: string;
  formData: any;
  updatedAt: Date;
}

// POST /api/submissions - Save tax form submission
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Get user's profile - check multiple fields for matching
    const { data: profiles } = await db
      .from('profiles')
      .select('id, userId, supabaseUserId, email')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId}${session?.user?.email ? `,email.eq.${session.user.email}` : ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get current tax year
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear - 1; // Previous year's taxes

    // Check if tax return already exists for this year
    const { data: existingReturns } = await db
      .from('tax_returns')
      .select('*')
      .eq('profileId', profile.id)
      .eq('taxYear', taxYear)
      .limit(1);

    const existingReturn = firstOrNull(existingReturns);
    let taxReturn: TaxReturn;

    if (existingReturn) {
      // Update existing tax return
      const { data: updated, error: updateError } = await db
        .from('tax_returns')
        .update({
          formData: body,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingReturn.id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update tax return: ${updateError?.message}`);
      }
      taxReturn = updated as TaxReturn;
    } else {
      // Create new tax return
      const { data: created, error: createError } = await db
        .from('tax_returns')
        .insert({
          profileId: profile.id,
          taxYear,
          status: 'DRAFT',
          formData: body,
        })
        .select()
        .single();

      if (createError || !created) {
        throw new Error(`Failed to create tax return: ${createError?.message}`);
      }
      taxReturn = created as TaxReturn;
    }

    return NextResponse.json({ success: true, taxReturnId: taxReturn.id });
  } catch (error) {
    logger.error('Error saving tax form submission:', error);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}

// GET /api/submissions - Get latest tax form submission
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, userId, supabaseUserId, email')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId}${session?.user?.email ? `,email.eq.${session.user.email}` : ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get current tax year
    const currentYear = new Date().getFullYear();
    const taxYear = currentYear - 1;

    // Get tax return for this year
    const { data: taxReturns } = await db
      .from('tax_returns')
      .select('*')
      .eq('profileId', profile.id)
      .eq('taxYear', taxYear)
      .limit(1);

    const taxReturn = firstOrNull(taxReturns);

    if (!taxReturn) {
      return NextResponse.json({ formData: null });
    }

    return NextResponse.json({ formData: taxReturn.formData });
  } catch (error) {
    logger.error('Error fetching tax form submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}
