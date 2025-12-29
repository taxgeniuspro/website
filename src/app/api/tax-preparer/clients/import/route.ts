import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface Profile {
  id: string;
  email: string | null;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a tax preparer or admin
    const role = user?.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get preparer profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles);

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get CSV data from request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
    }

    // Skip header row
    const dataLines = lines.slice(1);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const line of dataLines) {
      try {
        // Parse CSV line (simple parsing - doesn't handle quoted commas)
        const parts = line.split(',').map((p) => p.trim());

        if (parts.length < 4) {
          errors.push(`Skipped invalid line: ${line.substring(0, 50)}`);
          skipped++;
          continue;
        }

        const [clientId, firstName, lastName, email, phone] = parts;

        // Skip if no essential data
        if (!firstName && !lastName && !email) {
          errors.push(`Skipped line with no name or email`);
          skipped++;
          continue;
        }

        // Check if client already exists
        let client: Profile | null = null;

        // Try to find by ID first
        if (clientId) {
          const { data: byId } = await db
            .from('profiles')
            .select('id, email')
            .eq('id', clientId)
            .limit(1);
          client = firstOrNull(byId);
        }

        // Try to find by email if not found by ID
        if (!client && email) {
          const { data: byEmail } = await db
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .limit(1);
          client = firstOrNull(byEmail);
        }

        // Create client if doesn't exist
        if (!client && email) {
          const { data: newProfile, error: insertError } = await db
            .from('profiles')
            .insert({
              email: email,
              firstName: firstName || null,
              lastName: lastName || null,
              phone: phone || null,
              role: 'client',
              userId: `imported_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              affiliateStatus: 'APPROVED',
              affiliateApprovedAt: new Date().toISOString(),
            })
            .select('id, email')
            .single();

          if (insertError) {
            errors.push(`Error creating profile for ${email}: ${insertError.message}`);
            skipped++;
            continue;
          }
          client = newProfile;
        }

        if (!client) {
          errors.push(`Could not create or find client: ${email || firstName + ' ' + lastName}`);
          skipped++;
          continue;
        }

        // Check if already assigned to this preparer
        const { data: existingAssignments } = await db
          .from('client_preparers')
          .select('id, isActive')
          .eq('clientId', client.id)
          .eq('preparerId', preparerProfile.id)
          .limit(1);

        const existingAssignment = firstOrNull(existingAssignments) as ClientPreparer | null;

        if (existingAssignment) {
          // Update to active if it was inactive
          if (!existingAssignment.isActive) {
            await db
              .from('client_preparers')
              .update({ isActive: true })
              .eq('id', existingAssignment.id);
            imported++;
          } else {
            skipped++;
          }
        } else {
          // Create new assignment
          const { error: assignError } = await db.from('client_preparers').insert({
            clientId: client.id,
            preparerId: preparerProfile.id,
            isActive: true,
          });

          if (assignError) {
            errors.push(`Error assigning client ${email}: ${assignError.message}`);
            skipped++;
            continue;
          }
          imported++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error processing line: ${errorMsg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Error importing clients:', error);
    return NextResponse.json(
      {
        error: 'Failed to import clients',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
