import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/clients
 * Fetches all clients assigned to the authenticated preparer
 *
 * Epic 3, Story 3.3: Preparer Client & Document Portal
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const preparerProfile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
        role: 'PREPARER',
      },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    // Get all clients assigned to this preparer
    const clientAssignments = await prisma.clientPreparer.findMany({
      where: {
        preparerId: preparerProfile.id,
        isActive: true,
      },
      include: {
        client: {
          include: {
            user: true,
            taxReturns: {
              orderBy: {
                taxYear: 'desc',
              },
              take: 1, // Get most recent tax return
              include: {
                documents: true,
              },
            },
          },
        },
      },
    });

    // Transform data for response
    const clients = clientAssignments.map((assignment) => {
      const client = assignment.client;
      const mostRecentReturn = client.taxReturns[0];

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.user.email,
        phone: client.phone,
        assignedAt: assignment.assignedAt,
        currentReturn: mostRecentReturn
          ? {
              id: mostRecentReturn.id,
              taxYear: mostRecentReturn.taxYear,
              status: mostRecentReturn.status,
              documentCount: mostRecentReturn.documents.length,
              createdAt: mostRecentReturn.createdAt,
              updatedAt: mostRecentReturn.updatedAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      clients,
      totalClients: clients.length,
    });
  } catch (error) {
    logger.error('Error fetching preparer clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

/**
 * POST /api/preparers/clients
 * Assigns a client to the authenticated preparer
 *
 * Body: { clientEmail: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const preparerProfile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
        role: 'PREPARER',
      },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { clientEmail } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 });
    }

    // Find client profile
    const clientProfile = await prisma.profile.findFirst({
      where: {
        user: { email: clientEmail },
        role: 'client',
      },
    });

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.clientPreparer.findUnique({
      where: {
        clientId_preparerId: {
          clientId: clientProfile.id,
          preparerId: preparerProfile.id,
        },
      },
    });

    if (existingAssignment) {
      // Reactivate if inactive
      if (!existingAssignment.isActive) {
        await prisma.clientPreparer.update({
          where: { id: existingAssignment.id },
          data: { isActive: true },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Client already assigned',
        assignment: existingAssignment,
      });
    }

    // Create new assignment
    const assignment = await prisma.clientPreparer.create({
      data: {
        clientId: clientProfile.id,
        preparerId: preparerProfile.id,
      },
    });

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error) {
    logger.error('Error assigning client:', error);
    return NextResponse.json({ error: 'Failed to assign client' }, { status: 500 });
  }
}
