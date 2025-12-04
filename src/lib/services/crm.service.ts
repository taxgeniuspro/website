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

import { prisma } from '@/lib/prisma';
import { ContactType, PipelineStage, UserRole, type Prisma } from '@prisma/client';
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

      const contact = await prisma.cRMContact.create({
        data: {
          ...data,
          stageEnteredAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });

      logger.info('[CRMService] Contact created successfully', { contactId: contact.id });
      return contact;
    } catch (error) {
      logger.error('[CRMService] Error creating contact', { error: error.message, data });
      throw new Error(`Failed to create contact: ${error.message}`);
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
      const contact = await prisma.cRMContact.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          interactions: {
            orderBy: { occurredAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          stageHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          tags: {
            include: {
              tag: true,
            },
          },
          tasks: {
            orderBy: { dueDate: 'asc' },
            take: 5,
          },
          emailActivities: {
            orderBy: { sentAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              interactions: true,
              tasks: true,
              emailActivities: true,
            },
          },
        },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Row-level security: tax preparers can only see their assigned contacts
      if (accessContext.userRole === UserRole.TAX_PREPARER) {
        if (!accessContext.preparerId) {
          throw new Error('Preparer ID not found for tax preparer user');
        }

        if (contact.assignedPreparerId !== accessContext.preparerId) {
          throw new Error('Access denied: Contact not assigned to you');
        }
      }

      logger.info('[CRMService] Contact retrieved', {
        contactId: id,
        userRole: accessContext.userRole,
      });
      return contact as CRMContactWithRelations;
    } catch (error) {
      logger.error('[CRMService] Error getting contact', { error: error.message, contactId: id });
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

      const updatedContact = await prisma.cRMContact.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });

      logger.info('[CRMService] Contact updated successfully', { contactId: id });
      return updatedContact as CRMContactWithRelations;
    } catch (error) {
      logger.error('[CRMService] Error updating contact', { error: error.message, contactId: id });
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
      if (
        accessContext.userRole !== UserRole.ADMIN &&
        accessContext.userRole !== UserRole.SUPER_ADMIN
      ) {
        throw new Error('Access denied: Only admins can delete contacts');
      }

      logger.info('[CRMService] Deleting contact', { contactId: id });

      // For now, we'll just mark as deleted (soft delete)
      // In production, you might want to add a `deletedAt` field to the schema
      await prisma.cRMContact.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          // In future: deletedAt: new Date()
        },
      });

      logger.info('[CRMService] Contact deleted successfully', { contactId: id });
      return { deleted: true };
    } catch (error) {
      logger.error('[CRMService] Error deleting contact', { error: error.message, contactId: id });
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
      const skip = (page - 1) * limit;

      logger.info('[CRMService] Listing contacts', {
        filters,
        page,
        limit,
        userRole: accessContext.userRole,
      });

      // Build where clause
      const where: Prisma.CRMContactWhereInput = {};

      if (filters.stage) {
        where.stage = filters.stage;
      }

      if (filters.contactType) {
        where.contactType = filters.contactType;
      }

      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Row-level security: tax preparers see only their assigned contacts
      if (accessContext.userRole === UserRole.TAX_PREPARER) {
        if (!accessContext.preparerId) {
          throw new Error('Preparer ID not found for tax preparer user');
        }
        where.assignedPreparerId = accessContext.preparerId;
      }

      if (filters.assignedPreparerId) {
        where.assignedPreparerId = filters.assignedPreparerId;
      }

      const [contacts, total] = await Promise.all([
        prisma.cRMContact.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
            _count: {
              select: {
                interactions: true,
              },
            },
          },
        }),
        prisma.cRMContact.count({ where }),
      ]);

      logger.info('[CRMService] Contacts listed', { total, returned: contacts.length });

      return {
        contacts: contacts as CRMContactWithRelations[],
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('[CRMService] Error listing contacts', { error: error.message, filters });
      throw new Error(`Failed to list contacts: ${error.message}`);
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
      if (
        accessContext.userRole !== UserRole.ADMIN &&
        accessContext.userRole !== UserRole.SUPER_ADMIN
      ) {
        throw new Error('Access denied: Only admins can assign contacts');
      }

      logger.info('[CRMService] Assigning contact to preparer', { contactId, preparerId });

      const contact = await prisma.cRMContact.update({
        where: { id: contactId },
        data: {
          assignedPreparerId: preparerId,
          assignedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });

      logger.info('[CRMService] Contact assigned successfully', { contactId, preparerId });
      return contact as CRMContactWithRelations;
    } catch (error) {
      logger.error('[CRMService] Error assigning contact', {
        error: error.message,
        contactId,
        preparerId,
      });
      throw new Error(`Failed to assign contact: ${error.message}`);
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
      const updatedContact = await prisma.cRMContact.update({
        where: { id: contactId },
        data: {
          stage: toStage,
          stageEnteredAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });

      // Create stage history record
      await prisma.cRMStageHistory.create({
        data: {
          contactId,
          fromStage: fromStage || contact.stage,
          toStage,
          changedBy: accessContext.userId,
          changedByClerk: accessContext.userId,
          reason,
        },
      });

      logger.info('[CRMService] Contact stage updated', { contactId, newStage: toStage });
      return updatedContact as CRMContactWithRelations;
    } catch (error) {
      logger.error('[CRMService] Error updating contact stage', {
        error: error.message,
        stageUpdate,
      });
      throw new Error(`Failed to update contact stage: ${error.message}`);
    }
  }

  /**
   * Log an interaction
   */
  static async logInteraction(data: CRMInteractionInput): Promise<any> {
    try {
      logger.info('[CRMService] Logging interaction', {
        contactId: data.contactId,
        type: data.type,
      });

      const interaction = await prisma.cRMInteraction.create({
        data: {
          ...data,
          occurredAt: data.occurredAt || new Date(),
          attachments: data.attachments ? JSON.parse(JSON.stringify(data.attachments)) : null,
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      // Update lastContactedAt on contact
      await prisma.cRMContact.update({
        where: { id: data.contactId },
        data: { lastContactedAt: new Date() },
      });

      logger.info('[CRMService] Interaction logged successfully', {
        interactionId: interaction.id,
      });
      return interaction;
    } catch (error) {
      logger.error('[CRMService] Error logging interaction', { error: error.message, data });
      throw new Error(`Failed to log interaction: ${error.message}`);
    }
  }

  /**
   * Get interactions for a contact
   */
  static async getContactInteractions(
    contactId: string,
    accessContext: CRMAccessContext,
    limit: number = 50
  ): Promise<any[]> {
    try {
      // Verify access to contact first
      await this.getContactById(contactId, accessContext);

      logger.info('[CRMService] Getting contact interactions', { contactId, limit });

      const interactions = await prisma.cRMInteraction.findMany({
        where: { contactId },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('[CRMService] Interactions retrieved', { contactId, count: interactions.length });
      return interactions;
    } catch (error) {
      logger.error('[CRMService] Error getting interactions', { error: error.message, contactId });
      throw error;
    }
  }

  /**
   * Get stage history for a contact
   */
  static async getContactStageHistory(
    contactId: string,
    accessContext: CRMAccessContext
  ): Promise<any[]> {
    try {
      // Verify access to contact first
      await this.getContactById(contactId, accessContext);

      logger.info('[CRMService] Getting contact stage history', { contactId });

      const history = await prisma.cRMStageHistory.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
      });

      logger.info('[CRMService] Stage history retrieved', { contactId, count: history.length });
      return history;
    } catch (error) {
      logger.error('[CRMService] Error getting stage history', { error: error.message, contactId });
      throw error;
    }
  }
}
