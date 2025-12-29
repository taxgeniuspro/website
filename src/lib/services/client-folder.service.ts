/**
 * Client Folder Service
 *
 * Manages folder creation and organization for tax intake leads.
 * Creates folder structure: {LastName}-{FirstName}/{TaxYear}/
 *
 * Example: Cobb-LaShasta/2025/
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface FolderRecord {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  parentId?: string | null;
  path: string;
  level: number;
  permissions?: Record<string, string[]> | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaxIntakeLeadRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  clientFolderId?: string | null;
  assignedPreparerId?: string | null;
}

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
    const { data: clientFolderData } = await db
      .from('folders')
      .select('*')
      .eq('name', clientFolderName)
      .eq('ownerId', ownerId)
      .is('parentId', null)
      .eq('isDeleted', false)
      .limit(1);

    let clientFolder = firstOrNull(clientFolderData) as FolderRecord | null;

    // Create client root folder if it doesn't exist
    if (!clientFolder) {
      const { data: newFolderData, error: createError } = await db
        .from('folders')
        .insert({
          name: clientFolderName,
          description: `Documents for ${firstName} ${lastName}`,
          ownerId,
          path: clientPath,
          level: 0, // Root level
          permissions: {
            tax_preparer: ['read', 'write', 'delete'],
            client: ['read', 'upload'],
          },
        })
        .select()
        .single();

      if (createError) throw createError;
      clientFolder = newFolderData as FolderRecord;

      logger.info('ClientFolderService: Created client root folder', {
        folderId: clientFolder.id,
        name: clientFolderName,
        path: clientPath,
      });
    }

    // Try to find existing year folder
    const { data: yearFolderData } = await db
      .from('folders')
      .select('*')
      .eq('name', String(taxYear))
      .eq('parentId', clientFolder.id)
      .eq('isDeleted', false)
      .limit(1);

    let yearFolder = firstOrNull(yearFolderData) as FolderRecord | null;

    // Create year folder if it doesn't exist
    if (!yearFolder) {
      const { data: newYearData, error: yearError } = await db
        .from('folders')
        .insert({
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
        })
        .select()
        .single();

      if (yearError) throw yearError;
      yearFolder = newYearData as FolderRecord;

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

    let query = db
      .from('folders')
      .select('id, name, path')
      .eq('name', clientFolderName)
      .is('parentId', null)
      .eq('isDeleted', false);

    if (ownerId) {
      query = query.eq('ownerId', ownerId);
    }

    const { data: folderData } = await query.limit(1);
    const folder = firstOrNull(folderData) as { id: string; name: string; path: string } | null;

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
    const { data: leadData } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, clientFolderId')
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leadData) as TaxIntakeLeadRecord | null;

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.clientFolderId) {
      // Already has a folder, return existing structure
      const { data: existingFolderData } = await db
        .from('folders')
        .select('*')
        .eq('id', lead.clientFolderId)
        .limit(1);

      const existingFolder = firstOrNull(existingFolderData) as FolderRecord | null;

      if (existingFolder) {
        // Get latest child folder (year folder)
        const { data: childrenData } = await db
          .from('folders')
          .select('id, path')
          .eq('parentId', existingFolder.id)
          .eq('isDeleted', false)
          .order('name', { ascending: false })
          .limit(1);

        const yearFolder = firstOrNull(childrenData) as { id: string; path: string } | null;

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
    await db
      .from('tax_intake_leads')
      .update({ clientFolderId: result.folderId })
      .eq('id', leadId);

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
    // Get leads with folder IDs
    const { data: leadsData } = await db
      .from('tax_intake_leads')
      .select('id, first_name, last_name, email, clientFolderId')
      .eq('assignedPreparerId', preparerId)
      .not('clientFolderId', 'is', null);

    const leads = (leadsData || []) as TaxIntakeLeadRecord[];

    const result: Array<{
      folder: { id: string; name: string; path: string; documentCount: number };
      lead: { id: string; firstName: string; lastName: string; email: string };
    }> = [];

    for (const lead of leads) {
      if (!lead.clientFolderId) continue;

      // Get folder details
      const { data: folderData } = await db
        .from('folders')
        .select('id, name, path')
        .eq('id', lead.clientFolderId)
        .limit(1);

      const folder = firstOrNull(folderData) as { id: string; name: string; path: string } | null;
      if (!folder) continue;

      // Get document count
      const { count: documentCount } = await db
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('folderId', folder.id);

      result.push({
        folder: {
          id: folder.id,
          name: folder.name,
          path: folder.path,
          documentCount: documentCount || 0,
        },
        lead: {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email,
        },
      });
    }

    return result;
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
    let query = db
      .from('folders')
      .select('id, name, path')
      .ilike('name', `%${searchTerm}%`)
      .is('parentId', null) // Root folders only (client folders)
      .eq('isDeleted', false);

    if (preparerId) {
      query = query.eq('ownerId', preparerId);
    }

    const { data: foldersData } = await query.limit(20);

    const folders = (foldersData || []) as { id: string; name: string; path: string }[];

    // Get document counts for each folder
    const result: Array<{ id: string; name: string; path: string; documentCount: number }> = [];

    for (const folder of folders) {
      const { count: documentCount } = await db
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('folderId', folder.id);

      result.push({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        documentCount: documentCount || 0,
      });
    }

    return result;
  }
}
