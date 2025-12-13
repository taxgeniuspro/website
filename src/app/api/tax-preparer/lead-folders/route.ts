/**
 * Lead Folders API Route
 *
 * GET /api/tax-preparer/lead-folders - Get folders for leads assigned to preparer
 * POST /api/tax-preparer/lead-folders - Create folder for a specific lead
 *
 * Auth: tax_preparer, admin, super_admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';

/**
 * GET /api/tax-preparer/lead-folders
 * Fetches folders for all leads assigned to the authenticated tax preparer
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin' ;
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access lead folders' },
        { status: 403 }
      );
    }

    // Get preparer profile ID
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!preparerProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    // Get all leads with folders for this preparer
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: isTaxPreparer ? user.id : undefined,
        ...(search && {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        clientFolderId: true,
        convertedToClient: true,
        created_at: true,
        clientFolder: {
          select: {
            id: true,
            name: true,
            path: true,
            _count: {
              select: { documents: true },
            },
            children: {
              where: { isDeleted: false },
              select: {
                id: true,
                name: true,
                path: true,
                _count: {
                  select: { documents: true },
                },
              },
              orderBy: { name: 'desc' },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Transform the data for the frontend
    const leadFolders = leads.map((lead) => ({
      lead: {
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        convertedToClient: lead.convertedToClient,
        createdAt: lead.created_at,
      },
      folder: lead.clientFolder
        ? {
            id: lead.clientFolder.id,
            name: lead.clientFolder.name,
            path: lead.clientFolder.path,
            documentCount: lead.clientFolder._count.documents,
            yearFolders: lead.clientFolder.children.map((child) => ({
              id: child.id,
              name: child.name,
              path: child.path,
              documentCount: child._count.documents,
            })),
          }
        : null,
    }));

    // Calculate stats
    const stats = {
      totalLeads: leads.length,
      leadsWithFolders: leads.filter((l) => l.clientFolderId).length,
      leadsWithoutFolders: leads.filter((l) => !l.clientFolderId).length,
      totalDocuments: leads.reduce(
        (sum, l) =>
          sum +
          (l.clientFolder?._count.documents || 0) +
          (l.clientFolder?.children.reduce(
            (childSum, c) => childSum + c._count.documents,
            0
          ) || 0),
        0
      ),
    };

    logger.info('Lead folders fetched', {
      userId: user.id,
      leadCount: leads.length,
    });

    return NextResponse.json({
      success: true,
      leadFolders,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching lead folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tax-preparer/lead-folders
 * Creates a folder for a specific lead
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin' ;
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can create lead folders' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    // Get the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        clientFolderId: true,
        assignedPreparerId: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify preparer has access to this lead
    if (isTaxPreparer && lead.assignedPreparerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this lead' },
        { status: 403 }
      );
    }

    // Check if folder already exists
    if (lead.clientFolderId) {
      const existingFolder = await prisma.folder.findUnique({
        where: { id: lead.clientFolderId },
        select: {
          id: true,
          name: true,
          path: true,
        },
      });

      if (existingFolder) {
        return NextResponse.json({
          success: true,
          message: 'Folder already exists',
          folder: existingFolder,
        });
      }
    }

    // Get preparer profile ID for folder ownership
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!preparerProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Create folder structure
    const currentYear = new Date().getFullYear();
    const folderResult = await ClientFolderService.getOrCreateClientFolder(
      preparerProfile.id,
      lead.first_name,
      lead.last_name,
      currentYear
    );

    // Link folder to lead
    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: { clientFolderId: folderResult.folderId },
    });

    logger.info('Lead folder created', {
      leadId,
      folderId: folderResult.folderId,
      path: folderResult.path,
    });

    return NextResponse.json({
      success: true,
      message: 'Folder created successfully',
      folder: {
        id: folderResult.folderId,
        path: folderResult.path,
        yearFolderId: folderResult.yearFolderId,
        yearPath: folderResult.yearPath,
      },
    });
  } catch (error) {
    logger.error('Error creating lead folder:', error);
    return NextResponse.json(
      { error: 'Failed to create lead folder' },
      { status: 500 }
    );
  }
}
