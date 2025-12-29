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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ClientFolderService } from '@/lib/services/client-folder.service';

// Local type definitions
interface Profile {
  id: string;
}

interface TaxIntakeLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  clientFolderId: string | null;
  convertedToClient: boolean;
  assignedPreparerId: string | null;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface Document {
  id: string;
  folderId: string;
}

interface ChildFolder {
  id: string;
  name: string;
  path: string;
  parentId: string;
}

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
    const isAdmin = role === 'admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access lead folders' },
        { status: 403 }
      );
    }

    // Get preparer profile ID
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles) as Profile | null;

    if (!preparerProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    // Build leads query
    let query = db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, phone, clientFolderId, convertedToClient, assignedPreparerId, created_at');

    // Tax preparers can only see their assigned leads
    if (isTaxPreparer) {
      query = query.eq('assignedPreparerId', preparerProfile.id);
    }

    // Search filter
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      throw new Error(leadsError.message);
    }

    // Get folder IDs from leads
    const folderIds = (leads || [])
      .map((l: TaxIntakeLead) => l.clientFolderId)
      .filter(Boolean) as string[];

    // Get folders
    let foldersMap = new Map<string, Folder>();
    let childFoldersMap = new Map<string, ChildFolder[]>();
    let docCountMap = new Map<string, number>();

    if (folderIds.length > 0) {
      // Get parent folders
      const { data: folders } = await db
        .from('folders')
        .select('id, name, path')
        .in('id', folderIds);

      for (const f of folders || []) {
        foldersMap.set(f.id, f);
      }

      // Get child folders (year folders)
      const { data: childFolders } = await db
        .from('folders')
        .select('id, name, path, parentId')
        .in('parentId', folderIds)
        .eq('isDeleted', false)
        .order('name', { ascending: false });

      for (const cf of childFolders || []) {
        if (!childFoldersMap.has(cf.parentId)) {
          childFoldersMap.set(cf.parentId, []);
        }
        childFoldersMap.get(cf.parentId)!.push(cf);
      }

      // Get document counts for all folders (parent and children)
      const allFolderIds = [
        ...folderIds,
        ...(childFolders || []).map((cf: ChildFolder) => cf.id),
      ];

      const { data: documents } = await db
        .from('documents')
        .select('id, folderId')
        .in('folderId', allFolderIds);

      for (const doc of documents || []) {
        docCountMap.set(doc.folderId, (docCountMap.get(doc.folderId) || 0) + 1);
      }
    }

    // Transform the data for the frontend
    const leadFolders = (leads || []).map((lead: TaxIntakeLead) => {
      const folder = lead.clientFolderId ? foldersMap.get(lead.clientFolderId) : null;
      const children = lead.clientFolderId ? childFoldersMap.get(lead.clientFolderId) || [] : [];

      return {
        lead: {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          convertedToClient: lead.convertedToClient,
          createdAt: lead.created_at,
        },
        folder: folder
          ? {
              id: folder.id,
              name: folder.name,
              path: folder.path,
              documentCount: docCountMap.get(folder.id) || 0,
              yearFolders: children.map((child: ChildFolder) => ({
                id: child.id,
                name: child.name,
                path: child.path,
                documentCount: docCountMap.get(child.id) || 0,
              })),
            }
          : null,
      };
    });

    // Calculate stats
    const stats = {
      totalLeads: (leads || []).length,
      leadsWithFolders: (leads || []).filter((l: TaxIntakeLead) => l.clientFolderId).length,
      leadsWithoutFolders: (leads || []).filter((l: TaxIntakeLead) => !l.clientFolderId).length,
      totalDocuments: leadFolders.reduce(
        (sum: number, lf: { folder: { documentCount: number; yearFolders: { documentCount: number }[] } | null }) =>
          sum +
          (lf.folder?.documentCount || 0) +
          (lf.folder?.yearFolders.reduce(
            (childSum: number, c: { documentCount: number }) => childSum + c.documentCount,
            0
          ) || 0),
        0
      ),
    };

    logger.info('Lead folders fetched', {
      userId: user.id,
      leadCount: (leads || []).length,
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
    const isAdmin = role === 'admin';
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
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, clientFolderId, assignedPreparerId')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads) as TaxIntakeLead | null;

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify preparer has access to this lead
    if (isTaxPreparer) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id')
        .eq('userId', user.id)
        .limit(1);

      const preparerProfile = firstOrNull(profiles) as Profile | null;

      if (lead.assignedPreparerId !== preparerProfile?.id) {
        return NextResponse.json(
          { error: 'You do not have access to this lead' },
          { status: 403 }
        );
      }
    }

    // Check if folder already exists
    if (lead.clientFolderId) {
      const { data: existingFolders } = await db
        .from('folders')
        .select('id, name, path')
        .eq('id', lead.clientFolderId)
        .limit(1);

      const existingFolder = firstOrNull(existingFolders);

      if (existingFolder) {
        return NextResponse.json({
          success: true,
          message: 'Folder already exists',
          folder: existingFolder,
        });
      }
    }

    // Get preparer profile ID for folder ownership
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles) as Profile | null;

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
    await db
      .from('tax_intake_leads')
      .update({ clientFolderId: folderResult.folderId })
      .eq('id', leadId);

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
