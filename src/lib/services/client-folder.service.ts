/**
 * Client Folder Service
 *
 * Manages folder creation and organization for tax intake leads.
 * Creates folder structure: {LastName}-{FirstName}/{TaxYear}/
 *
 * Example: Cobb-LaShasta/2025/
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Sanitize a string for use in folder names
 * Removes special characters, keeps alphanumeric, hyphens, and underscores
 */
function sanitizeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except hyphen
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .substring(0, 50); // Limit length
}

/**
 * Generate client folder name from first and last name
 * Format: LastName-FirstName
 */
function generateClientFolderName(firstName: string, lastName: string): string {
  const sanitizedLast = sanitizeFolderName(lastName);
  const sanitizedFirst = sanitizeFolderName(firstName);
  return `${sanitizedLast}-${sanitizedFirst}`;
}

export interface ClientFolderResult {
  folderId: string;
  path: string;
  yearFolderId: string;
  yearPath: string;
}

export class ClientFolderService {
  /**
   * Get or create a client folder structure
   * Creates: /{LastName}-{FirstName}/{TaxYear}/
   *
   * @param ownerId - Profile ID of the folder owner (typically the assigned preparer)
   * @param firstName - Client's first name
   * @param lastName - Client's last name
   * @param taxYear - Tax year for the subfolder (e.g., 2025)
   * @returns Folder IDs and paths for both client root and year folder
   */
  static async getOrCreateClientFolder(
    ownerId: string,
    firstName: string,
    lastName: string,
    taxYear: number
  ): Promise<ClientFolderResult> {
    const clientFolderName = generateClientFolderName(firstName, lastName);
    const clientPath = `/${clientFolderName}`;
    const yearPath = `${clientPath}/${taxYear}`;

    logger.info('ClientFolderService: Getting or creating client folder', {
      ownerId,
      clientFolderName,
      taxYear,
    });

    // Try to find existing client root folder
    let clientFolder = await prisma.folder.findFirst({
      where: {
        name: clientFolderName,
        ownerId,
        parentId: null, // Root level
        isDeleted: false,
      },
    });

    // Create client root folder if it doesn't exist
    if (!clientFolder) {
      clientFolder = await prisma.folder.create({
        data: {
          name: clientFolderName,
          description: `Documents for ${firstName} ${lastName}`,
          ownerId,
          path: clientPath,
          level: 0, // Root level
          permissions: {
            tax_preparer: ['read', 'write', 'delete'],
            client: ['read', 'upload'],
          },
        },
      });

      logger.info('ClientFolderService: Created client root folder', {
        folderId: clientFolder.id,
        name: clientFolderName,
        path: clientPath,
      });
    }

    // Try to find existing year folder
    let yearFolder = await prisma.folder.findFirst({
      where: {
        name: String(taxYear),
        parentId: clientFolder.id,
        isDeleted: false,
      },
    });

    // Create year folder if it doesn't exist
    if (!yearFolder) {
      yearFolder = await prisma.folder.create({
        data: {
          name: String(taxYear),
          description: `Tax year ${taxYear} documents`,
          ownerId,
          parentId: clientFolder.id,
          path: yearPath,
          level: 1,
          permissions: {
            tax_preparer: ['read', 'write', 'delete'],
            client: ['read', 'upload'],
          },
        },
      });

      logger.info('ClientFolderService: Created tax year folder', {
        folderId: yearFolder.id,
        year: taxYear,
        path: yearPath,
      });
    }

    return {
      folderId: clientFolder.id,
      path: clientPath,
      yearFolderId: yearFolder.id,
      yearPath: yearPath,
    };
  }

  /**
   * Find a client folder by name pattern
   */
  static async findClientFolder(
    lastName: string,
    firstName: string,
    ownerId?: string
  ): Promise<{ id: string; name: string; path: string } | null> {
    const clientFolderName = generateClientFolderName(firstName, lastName);

    const folder = await prisma.folder.findFirst({
      where: {
        name: clientFolderName,
        ...(ownerId && { ownerId }),
        parentId: null,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        path: true,
      },
    });

    return folder;
  }

  /**
   * Create a folder for an existing lead that doesn't have one
   */
  static async createFolderForLead(
    leadId: string,
    ownerId: string
  ): Promise<ClientFolderResult> {
    // Get the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        clientFolderId: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.clientFolderId) {
      // Already has a folder, return existing structure
      const existingFolder = await prisma.folder.findUnique({
        where: { id: lead.clientFolderId },
        include: {
          children: {
            where: { isDeleted: false },
            orderBy: { name: 'desc' },
            take: 1,
          },
        },
      });

      if (existingFolder) {
        const yearFolder = existingFolder.children[0];
        return {
          folderId: existingFolder.id,
          path: existingFolder.path,
          yearFolderId: yearFolder?.id || existingFolder.id,
          yearPath: yearFolder?.path || existingFolder.path,
        };
      }
    }

    // Create new folder structure
    const currentYear = new Date().getFullYear();
    const result = await this.getOrCreateClientFolder(
      ownerId,
      lead.first_name,
      lead.last_name,
      currentYear
    );

    // Link folder to lead
    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: { clientFolderId: result.folderId },
    });

    logger.info('ClientFolderService: Linked folder to lead', {
      leadId,
      folderId: result.folderId,
    });

    return result;
  }

  /**
   * Get folders for all leads assigned to a preparer
   */
  static async getLeadFoldersForPreparer(
    preparerId: string
  ): Promise<
    Array<{
      folder: {
        id: string;
        name: string;
        path: string;
        documentCount: number;
      };
      lead: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }>
  > {
    const leads = await prisma.taxIntakeLead.findMany({
      where: {
        assignedPreparerId: preparerId,
        clientFolderId: { not: null },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        clientFolder: {
          select: {
            id: true,
            name: true,
            path: true,
            _count: {
              select: { documents: true },
            },
          },
        },
      },
    });

    return leads
      .filter((lead) => lead.clientFolder)
      .map((lead) => ({
        folder: {
          id: lead.clientFolder!.id,
          name: lead.clientFolder!.name,
          path: lead.clientFolder!.path,
          documentCount: lead.clientFolder!._count.documents,
        },
        lead: {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email,
        },
      }));
  }

  /**
   * Search folders by client name
   */
  static async searchFoldersByClientName(
    searchTerm: string,
    preparerId?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      path: string;
      documentCount: number;
    }>
  > {
    const folders = await prisma.folder.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
        parentId: null, // Root folders only (client folders)
        isDeleted: false,
        ...(preparerId && { ownerId: preparerId }),
      },
      select: {
        id: true,
        name: true,
        path: true,
        _count: {
          select: { documents: true },
        },
      },
      take: 20,
    });

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      documentCount: f._count.documents,
    }));
  }
}
