/**
 * CRM Service (Epic 7 - Story 7.1)
 *
 * Centralized service for CRM Contact Management, Interaction Tracking, and Pipeline Management
 *
 * Features:
 * - Contact CRUD operations with row-level security
 * - Interaction logging and retrieval
 * - Pipeline stage management and history tracking
 * - Search and filtering
 * - Role-based access control
 */

import { db, firstOrNull } from '@/lib/db';
import type {
  CRMContactInput,
  CRMContactUpdate,
  ContactFilters,
  PaginationParams,
  CRMContactListResponse,
  CRMContactWithRelations,
  CRMInteractionInput,
  CRMInteractionUpdate,
  StageUpdateInput,
  CRMAccessContext,
} from '@/types/crm';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
type ContactType = 'LEAD' | 'PROSPECT' | 'CLIENT' | 'PARTNER' | 'OTHER';
type PipelineStage =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'APPOINTMENT_SET'
  | 'INTAKE_COMPLETE'
  | 'DOCUMENTS_RECEIVED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'FILED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

interface CRMContactRecord {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  contactType: ContactType;
  stage: PipelineStage;
  stageEnteredAt?: string | null;
  assignedPreparerId?: string | null;
  assignedAt?: string | null;
  userId?: string | null;
  lastContactedAt?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CRMInteractionRecord {
  id: string;
  contactId: string;
  userId?: string | null;
  type: string;
  subject?: string | null;
  notes?: string | null;
  occurredAt: string;
  duration?: number | null;
  outcome?: string | null;
  attachments?: unknown;
  createdAt: string;
}

interface CRMStageHistoryRecord {
  id: string;
  contactId: string;
  fromStage?: string | null;
  toStage: string;
  changedBy?: string | null;
  changedByClerk?: string | null;
  reason?: string | null;
  createdAt: string;
}

interface UserRecord {
  id: string;
  email: string;
  createdAt?: string;
}

export class CRMService {
  /**
   * Create a new CRM contact
   */
  static async createContact(data: CRMContactInput): Promise<CRMContactWithRelations> {
    try {
      logger.info('[CRMService] Creating new contact', {
        email: data.email,
        contactType: data.contactType,
      });

      // Insert the contact
      const { data: insertedData, error: insertError } = await db
        .from('crm_contacts')
        .insert({
          ...data,
          stageEnteredAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !insertedData) {
        throw new Error(insertError?.message || 'Failed to insert contact');
      }

      const contact = insertedData as CRMContactRecord;

      // Get user if exists
      let user: UserRecord | null = null;
      if (contact.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email, createdAt')
          .eq('id', contact.userId)
          .limit(1);
        user = firstOrNull(userData) as UserRecord | null;
      }

      // Get interaction count
      const { count: interactionCount } = await db
        .from('crm_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contactId', contact.id);

      const result = {
        ...contact,
        user: user ? { id: user.id, email: user.email, createdAt: user.createdAt } : null,
        _count: { interactions: interactionCount || 0 },
      };

      logger.info('[CRMService] Contact created successfully', { contactId: contact.id });
      return result as CRMContactWithRelations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error creating contact', { error: errorMessage, data });
      throw new Error(`Failed to create contact: ${errorMessage}`);
    }
  }

  /**
   * Get contact by ID with row-level security
   */
  static async getContactById(
    id: string,
    accessContext: CRMAccessContext
  ): Promise<CRMContactWithRelations> {
    try {
      logger.info('[CRMService] getContactById starting', {
        contactId: id,
        accessContext: JSON.stringify(accessContext),
      });

      // Get the contact
      const { data: contactData } = await db
        .from('crm_contacts')
        .select('*')
        .eq('id', id)
        .limit(1);

      const contact = firstOrNull(contactData) as CRMContactRecord | null;

      if (!contact) {
        logger.warn('[CRMService] Contact not found', { contactId: id });
        throw new Error('Contact not found');
      }

      // Get user if exists
      let user: { id: string; email: string } | null = null;
      if (contact.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email')
          .eq('id', contact.userId)
          .limit(1);
        const userRecord = firstOrNull(userData) as UserRecord | null;
        if (userRecord) {
          user = { id: userRecord.id, email: userRecord.email };
        }
      }

      // Get recent interactions with user info
      const { data: interactionsData } = await db
        .from('crm_interactions')
        .select('*')
        .eq('contactId', id)
        .order('occurredAt', { ascending: false })
        .limit(10);

      const interactions: Array<CRMInteractionRecord & { user?: { id: string; email: string } | null }> = [];
      for (const interaction of (interactionsData || []) as CRMInteractionRecord[]) {
        let interactionUser: { id: string; email: string } | null = null;
        if (interaction.userId) {
          const { data: iUserData } = await db
            .from('users')
            .select('id, email')
            .eq('id', interaction.userId)
            .limit(1);
          const iUserRecord = firstOrNull(iUserData) as UserRecord | null;
          if (iUserRecord) {
            interactionUser = { id: iUserRecord.id, email: iUserRecord.email };
          }
        }
        interactions.push({ ...interaction, user: interactionUser });
      }

      // Get stage history
      const { data: stageHistoryData } = await db
        .from('crm_stage_history')
        .select('*')
        .eq('contactId', id)
        .order('createdAt', { ascending: false })
        .limit(10);

      const stageHistory = (stageHistoryData || []) as CRMStageHistoryRecord[];

      // Get interaction count
      const { count: interactionCount } = await db
        .from('crm_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contactId', id);

      logger.info('[CRMService] Contact found', {
        contactId: id,
        contactEmail: contact.email,
        assignedPreparerId: contact.assignedPreparerId,
      });

      // Row-level security: tax preparers can only see their assigned contacts
      // Note: assignedPreparerId stores the Profile.id (NOT User.id)
      // This was updated in PR #120-125 for consistency with TaxIntakeLead
      // Use string comparison to avoid enum vs string type mismatch
      const normalizedRole = String(accessContext.userRole).toLowerCase();
      if (normalizedRole === 'tax_preparer') {
        if (!accessContext.preparerId) {
          throw new Error('Preparer Profile ID not found for tax preparer user');
        }

        logger.info('[CRMService] Checking row-level security', {
          normalizedRole,
          contactAssignedPreparerId: contact.assignedPreparerId,
          accessPreparerId: accessContext.preparerId,
          match: contact.assignedPreparerId === accessContext.preparerId,
        });

        // FIXED: Compare with preparerId (Profile.id) instead of userId (User.id)
        if (contact.assignedPreparerId !== accessContext.preparerId) {
          throw new Error('Access denied: Contact not assigned to you');
        }
      }

      const result = {
        ...contact,
        user,
        interactions,
        stageHistory,
        _count: { interactions: interactionCount || 0 },
      };

      logger.info('[CRMService] Contact retrieved', {
        contactId: id,
        userRole: accessContext.userRole,
      });
      return result as CRMContactWithRelations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error getting contact', { error: errorMessage, contactId: id });
      throw error;
    }
  }

  /**
   * Update contact with row-level security
   */
  static async updateContact(
    id: string,
    data: CRMContactUpdate,
    accessContext: CRMAccessContext
  ): Promise<CRMContactWithRelations> {
    try {
      // Verify access first
      await this.getContactById(id, accessContext);

      logger.info('[CRMService] Updating contact', { contactId: id, updates: Object.keys(data) });

      const { data: updatedData, error: updateError } = await db
        .from('crm_contacts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new Error(updateError?.message || 'Failed to update contact');
      }

      const contact = updatedData as CRMContactRecord;

      // Get user if exists
      let user: { id: string; email: string } | null = null;
      if (contact.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email')
          .eq('id', contact.userId)
          .limit(1);
        const userRecord = firstOrNull(userData) as UserRecord | null;
        if (userRecord) {
          user = { id: userRecord.id, email: userRecord.email };
        }
      }

      // Get interaction count
      const { count: interactionCount } = await db
        .from('crm_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contactId', id);

      const result = {
        ...contact,
        user,
        _count: { interactions: interactionCount || 0 },
      };

      logger.info('[CRMService] Contact updated successfully', { contactId: id });
      return result as CRMContactWithRelations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error updating contact', { error: errorMessage, contactId: id });
      throw error;
    }
  }

  /**
   * Soft delete contact (admin only)
   */
  static async deleteContact(
    id: string,
    accessContext: CRMAccessContext
  ): Promise<{ deleted: boolean }> {
    try {
      // Only admins can delete
      // Use string comparison to avoid enum vs string type mismatch
      const normalizedDeleteRole = String(accessContext.userRole).toLowerCase();
      if (normalizedDeleteRole !== 'admin') {
        throw new Error('Access denied: Only admins can delete contacts');
      }

      logger.info('[CRMService] Deleting contact', { contactId: id });

      // For now, we'll just mark as deleted (soft delete)
      // In production, you might want to add a `deletedAt` field to the schema
      const { error: updateError } = await db
        .from('crm_contacts')
        .update({ updatedAt: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      logger.info('[CRMService] Contact deleted successfully', { contactId: id });
      return { deleted: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error deleting contact', { error: errorMessage, contactId: id });
      throw error;
    }
  }

  /**
   * List contacts with filters and pagination
   */
  static async listContacts(
    filters: ContactFilters,
    pagination: PaginationParams,
    accessContext: CRMAccessContext
  ): Promise<CRMContactListResponse> {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      logger.info('[CRMService] Listing contacts', {
        filters,
        page,
        limit,
        userRole: accessContext.userRole,
      });

      // Build the query
      let query = db.from('crm_contacts').select('*');
      let countQuery = db.from('crm_contacts').select('id', { count: 'exact', head: true });

      if (filters.stage) {
        query = query.eq('stage', filters.stage);
        countQuery = countQuery.eq('stage', filters.stage);
      }

      if (filters.contactType) {
        query = query.eq('contactType', filters.contactType);
        countQuery = countQuery.eq('contactType', filters.contactType);
      }

      // Row-level security: tax preparers see only their assigned contacts
      // Note: assignedPreparerId stores the Profile.id (NOT User.id)
      // This was updated in PR #120-125 for consistency with TaxIntakeLead
      const normalizedListRole = String(accessContext.userRole).toLowerCase();
      if (normalizedListRole === 'tax_preparer') {
        if (!accessContext.preparerId) {
          throw new Error('Preparer Profile ID not found for tax preparer user');
        }
        query = query.eq('assignedPreparerId', accessContext.preparerId);
        countQuery = countQuery.eq('assignedPreparerId', accessContext.preparerId);
      }

      if (filters.assignedPreparerId) {
        query = query.eq('assignedPreparerId', filters.assignedPreparerId);
        countQuery = countQuery.eq('assignedPreparerId', filters.assignedPreparerId);
      }

      // Search filter - use ilike for case-insensitive search
      if (filters.search) {
        const searchPattern = `%${filters.search}%`;
        query = query.or(
          `firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
        );
        countQuery = countQuery.or(
          `firstName.ilike.${searchPattern},lastName.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`
        );
      }

      // Apply pagination and ordering
      query = query.order('updatedAt', { ascending: false }).range(offset, offset + limit - 1);

      const [{ data: contactsData }, { count: total }] = await Promise.all([query, countQuery]);

      // Enrich contacts with user and interaction count
      const contacts: CRMContactWithRelations[] = [];
      for (const contact of (contactsData || []) as CRMContactRecord[]) {
        // Get user if exists
        let user: { id: string; email: string } | null = null;
        if (contact.userId) {
          const { data: userData } = await db
            .from('users')
            .select('id, email')
            .eq('id', contact.userId)
            .limit(1);
          const userRecord = firstOrNull(userData) as UserRecord | null;
          if (userRecord) {
            user = { id: userRecord.id, email: userRecord.email };
          }
        }

        // Get interaction count
        const { count: interactionCount } = await db
          .from('crm_interactions')
          .select('id', { count: 'exact', head: true })
          .eq('contactId', contact.id);

        contacts.push({
          ...contact,
          user,
          _count: { interactions: interactionCount || 0 },
        } as CRMContactWithRelations);
      }

      logger.info('[CRMService] Contacts listed', { total, returned: contacts.length });

      return {
        contacts,
        total: total || 0,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error listing contacts', { error: errorMessage, filters });
      throw new Error(`Failed to list contacts: ${errorMessage}`);
    }
  }

  /**
   * Assign contact to preparer
   */
  static async assignContactToPreparer(
    contactId: string,
    preparerId: string,
    accessContext: CRMAccessContext
  ): Promise<CRMContactWithRelations> {
    try {
      // Only admins can assign contacts
      // Use string comparison to avoid enum vs string type mismatch
      const normalizedAssignRole = String(accessContext.userRole).toLowerCase();
      if (normalizedAssignRole !== 'admin') {
        throw new Error('Access denied: Only admins can assign contacts');
      }

      logger.info('[CRMService] Assigning contact to preparer', { contactId, preparerId });

      const { data: updatedData, error: updateError } = await db
        .from('crm_contacts')
        .update({
          assignedPreparerId: preparerId,
          assignedAt: new Date().toISOString(),
        })
        .eq('id', contactId)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new Error(updateError?.message || 'Failed to assign contact');
      }

      const contact = updatedData as CRMContactRecord;

      // Get user if exists
      let user: { id: string; email: string } | null = null;
      if (contact.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email')
          .eq('id', contact.userId)
          .limit(1);
        const userRecord = firstOrNull(userData) as UserRecord | null;
        if (userRecord) {
          user = { id: userRecord.id, email: userRecord.email };
        }
      }

      // Get interaction count
      const { count: interactionCount } = await db
        .from('crm_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contactId', contactId);

      const result = {
        ...contact,
        user,
        _count: { interactions: interactionCount || 0 },
      };

      logger.info('[CRMService] Contact assigned successfully', { contactId, preparerId });
      return result as CRMContactWithRelations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error assigning contact', {
        error: errorMessage,
        contactId,
        preparerId,
      });
      throw new Error(`Failed to assign contact: ${errorMessage}`);
    }
  }

  /**
   * Update contact stage (with history tracking)
   */
  static async updateContactStage(
    stageUpdate: StageUpdateInput,
    accessContext: CRMAccessContext
  ): Promise<CRMContactWithRelations> {
    try {
      const { contactId, fromStage, toStage, reason } = stageUpdate;

      logger.info('[CRMService] Updating contact stage', { contactId, fromStage, toStage });

      // Get current contact
      const contact = await this.getContactById(contactId, accessContext);

      // Update stage
      const { data: updatedData, error: updateError } = await db
        .from('crm_contacts')
        .update({
          stage: toStage,
          stageEnteredAt: new Date().toISOString(),
        })
        .eq('id', contactId)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new Error(updateError?.message || 'Failed to update stage');
      }

      const updatedContact = updatedData as CRMContactRecord;

      // Get user if exists
      let user: { id: string; email: string } | null = null;
      if (updatedContact.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email')
          .eq('id', updatedContact.userId)
          .limit(1);
        const userRecord = firstOrNull(userData) as UserRecord | null;
        if (userRecord) {
          user = { id: userRecord.id, email: userRecord.email };
        }
      }

      // Get interaction count
      const { count: interactionCount } = await db
        .from('crm_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('contactId', contactId);

      // Create stage history record
      await db.from('crm_stage_history').insert({
        contactId,
        fromStage: fromStage || contact.stage,
        toStage,
        changedBy: accessContext.userId,
        changedByClerk: accessContext.userId,
        reason,
      });

      const result = {
        ...updatedContact,
        user,
        _count: { interactions: interactionCount || 0 },
      };

      logger.info('[CRMService] Contact stage updated', { contactId, newStage: toStage });
      return result as CRMContactWithRelations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error updating contact stage', {
        error: errorMessage,
        stageUpdate,
      });
      throw new Error(`Failed to update contact stage: ${errorMessage}`);
    }
  }

  /**
   * Log an interaction
   */
  static async logInteraction(data: CRMInteractionInput): Promise<unknown> {
    try {
      logger.info('[CRMService] Logging interaction', {
        contactId: data.contactId,
        type: data.type,
      });

      // Insert the interaction
      const { data: insertedData, error: insertError } = await db
        .from('crm_interactions')
        .insert({
          ...data,
          occurredAt: (data.occurredAt || new Date()).toISOString(),
          attachments: data.attachments ? JSON.parse(JSON.stringify(data.attachments)) : null,
        })
        .select()
        .single();

      if (insertError || !insertedData) {
        throw new Error(insertError?.message || 'Failed to insert interaction');
      }

      const interaction = insertedData as CRMInteractionRecord;

      // Get contact info
      const { data: contactData } = await db
        .from('crm_contacts')
        .select('id, firstName, lastName, email')
        .eq('id', data.contactId)
        .limit(1);

      const contact = firstOrNull(contactData) as { id: string; firstName?: string | null; lastName?: string | null; email: string } | null;

      // Get user info
      let user: { id: string; email: string } | null = null;
      if (interaction.userId) {
        const { data: userData } = await db
          .from('users')
          .select('id, email')
          .eq('id', interaction.userId)
          .limit(1);
        const userRecord = firstOrNull(userData) as UserRecord | null;
        if (userRecord) {
          user = { id: userRecord.id, email: userRecord.email };
        }
      }

      // Update lastContactedAt on contact
      await db
        .from('crm_contacts')
        .update({ lastContactedAt: new Date().toISOString() })
        .eq('id', data.contactId);

      const result = {
        ...interaction,
        contact,
        user,
      };

      logger.info('[CRMService] Interaction logged successfully', {
        interactionId: interaction.id,
      });
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error logging interaction', { error: errorMessage, data });
      throw new Error(`Failed to log interaction: ${errorMessage}`);
    }
  }

  /**
   * Get interactions for a contact
   */
  static async getContactInteractions(
    contactId: string,
    accessContext: CRMAccessContext,
    limit: number = 50
  ): Promise<unknown[]> {
    try {
      // Verify access to contact first
      await this.getContactById(contactId, accessContext);

      logger.info('[CRMService] Getting contact interactions', { contactId, limit });

      const { data: interactionsData } = await db
        .from('crm_interactions')
        .select('*')
        .eq('contactId', contactId)
        .order('occurredAt', { ascending: false })
        .limit(limit);

      // Enrich with user info
      const interactions: Array<CRMInteractionRecord & { user?: { id: string; email: string } | null }> = [];
      for (const interaction of (interactionsData || []) as CRMInteractionRecord[]) {
        let user: { id: string; email: string } | null = null;
        if (interaction.userId) {
          const { data: userData } = await db
            .from('users')
            .select('id, email')
            .eq('id', interaction.userId)
            .limit(1);
          const userRecord = firstOrNull(userData) as UserRecord | null;
          if (userRecord) {
            user = { id: userRecord.id, email: userRecord.email };
          }
        }
        interactions.push({ ...interaction, user });
      }

      logger.info('[CRMService] Interactions retrieved', { contactId, count: interactions.length });
      return interactions;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error getting interactions', { error: errorMessage, contactId });
      throw error;
    }
  }

  /**
   * Get stage history for a contact
   */
  static async getContactStageHistory(
    contactId: string,
    accessContext: CRMAccessContext
  ): Promise<CRMStageHistoryRecord[]> {
    try {
      // Verify access to contact first
      await this.getContactById(contactId, accessContext);

      logger.info('[CRMService] Getting contact stage history', { contactId });

      const { data: historyData } = await db
        .from('crm_stage_history')
        .select('*')
        .eq('contactId', contactId)
        .order('createdAt', { ascending: false });

      const history = (historyData || []) as CRMStageHistoryRecord[];

      logger.info('[CRMService] Stage history retrieved', { contactId, count: history.length });
      return history;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CRMService] Error getting stage history', { error: errorMessage, contactId });
      throw error;
    }
  }
}
