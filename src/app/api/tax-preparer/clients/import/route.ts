import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a tax preparer or admin
    const role = user?.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get preparer profile
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

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
        let client = await prisma.profile.findFirst({
          where: {
            OR: [{ id: clientId }, { email: email }],
          },
        });

        // Create client if doesn't exist
        if (!client && email) {
          client = await prisma.profile.create({
            data: {
              email: email,
              firstName: firstName || null,
              lastName: lastName || null,
              phone: phone || null,
              role: 'client',
              userId: `imported_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            },
          });
        }

        if (!client) {
          errors.push(`Could not create or find client: ${email || firstName + ' ' + lastName}`);
          skipped++;
          continue;
        }

        // Check if already assigned to this preparer
        const existingAssignment = await prisma.clientPreparer.findFirst({
          where: {
            clientId: client.id,
            preparerId: preparerProfile.id,
          },
        });

        if (existingAssignment) {
          // Update to active if it was inactive
          if (!existingAssignment.isActive) {
            await prisma.clientPreparer.update({
              where: { id: existingAssignment.id },
              data: { isActive: true },
            });
            imported++;
          } else {
            skipped++;
          }
        } else {
          // Create new assignment
          await prisma.clientPreparer.create({
            data: {
              clientId: client.id,
              preparerId: preparerProfile.id,
              isActive: true,
            },
          });
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
