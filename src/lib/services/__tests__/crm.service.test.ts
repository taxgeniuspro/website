/**
 * CRM Service Unit Tests (Epic 7 - Story 7.1)
 *
 * Tests for CRM contact management service layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CRMService } from '../crm.service';
import { prisma } from '@/lib/prisma';
import { ContactType, PipelineStage, UserRole, InteractionType, Direction } from '@prisma/client';
import type { CRMAccessContext } from '@/types/crm';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cRMContact: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    cRMInteraction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    cRMStageHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('CRMService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a new contact successfully', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: 'user-1',
        userId: 'clerk-user-1',
        contactType: ContactType.CLIENT,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        company: null,
        filingStatus: null,
        dependents: null,
        previousYearAGI: null,
        taxYear: null,
        stage: PipelineStage.NEW,
        stageEnteredAt: new Date(),
        source: 'manual',
        assignedPreparerId: null,
        assignedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastContactedAt: null,
        user: {
          id: 'user-1',
          email: 'john@example.com',
          createdAt: new Date(),
        },
        _count: {
          interactions: 0,
        },
      };

      vi.mocked(prisma.cRMContact.create).mockResolvedValue(mockContact as any);

      const result = await CRMService.createContact({
        userId: 'user-1',
        userId: 'clerk-user-1',
        contactType: ContactType.CLIENT,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        source: 'manual',
      });

      expect(result).toEqual(mockContact);
      expect(prisma.cRMContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          contactType: ContactType.CLIENT,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error on duplicate email', async () => {
      vi.mocked(prisma.cRMContact.create).mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`email`)')
      );

      await expect(
        CRMService.createContact({
          contactType: ContactType.CLIENT,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'duplicate@example.com',
        })
      ).rejects.toThrow('Failed to create contact');
    });
  });

  describe('getContactById', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    const preparerAccessContext: CRMAccessContext = {
      userId: 'preparer-1',
      userId: 'clerk-preparer-1',
      userRole: UserRole.TAX_PREPARER,
      preparerId: 'prep-id-1',
    };

    it('should return contact for admin', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        assignedPreparerId: 'prep-id-2',
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 0 },
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(mockContact as any);

      const result = await CRMService.getContactById('contact-1', adminAccessContext);

      expect(result).toEqual(mockContact);
      expect(prisma.cRMContact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        include: expect.any(Object),
      });
    });

    it('should return contact for assigned preparer', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        assignedPreparerId: 'prep-id-1',
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 0 },
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(mockContact as any);

      const result = await CRMService.getContactById('contact-1', preparerAccessContext);

      expect(result).toEqual(mockContact);
    });

    it('should deny access for non-assigned preparer', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-999', // Different preparer
        user: { id: 'user-1', email: 'john@example.com' },
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(mockContact as any);

      await expect(CRMService.getContactById('contact-1', preparerAccessContext)).rejects.toThrow(
        'Access denied: Contact not assigned to you'
      );
    });

    it('should throw error if contact not found', async () => {
      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(null);

      await expect(CRMService.getContactById('nonexistent', adminAccessContext)).rejects.toThrow(
        'Contact not found'
      );
    });
  });

  describe('updateContact', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should update contact successfully', async () => {
      const existingContact = {
        id: 'contact-1',
        assignedPreparerId: null,
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 0 },
      };

      const updatedContact = {
        ...existingContact,
        phone: '555-9999',
        company: 'Acme Corp',
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(existingContact as any);
      vi.mocked(prisma.cRMContact.update).mockResolvedValue(updatedContact as any);

      const result = await CRMService.updateContact(
        'contact-1',
        { phone: '555-9999', company: 'Acme Corp' },
        adminAccessContext
      );

      expect(result.phone).toBe('555-9999');
      expect(result.company).toBe('Acme Corp');
      expect(prisma.cRMContact.update).toHaveBeenCalled();
    });

    it('should enforce access control', async () => {
      const preparerAccessContext: CRMAccessContext = {
        userId: 'preparer-1',
        userId: 'clerk-preparer-1',
        userRole: UserRole.TAX_PREPARER,
        preparerId: 'prep-id-1',
      };

      const contact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-999', // Different preparer
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(contact as any);

      await expect(
        CRMService.updateContact('contact-1', { phone: '555-1111' }, preparerAccessContext)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteContact', () => {
    it('should allow admin to delete contact', async () => {
      const adminAccessContext: CRMAccessContext = {
        userId: 'admin-1',
        userId: 'clerk-admin-1',
        userRole: UserRole.ADMIN,
      };

      vi.mocked(prisma.cRMContact.update).mockResolvedValue({} as any);

      const result = await CRMService.deleteContact('contact-1', adminAccessContext);

      expect(result.deleted).toBe(true);
      expect(prisma.cRMContact.update).toHaveBeenCalled();
    });

    it('should deny non-admin from deleting', async () => {
      const preparerAccessContext: CRMAccessContext = {
        userId: 'preparer-1',
        userId: 'clerk-preparer-1',
        userRole: UserRole.TAX_PREPARER,
      };

      await expect(CRMService.deleteContact('contact-1', preparerAccessContext)).rejects.toThrow(
        'Only admins can delete contacts'
      );
    });
  });

  describe('listContacts', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should list contacts with pagination', async () => {
      const mockContacts = [
        { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
        { id: 'contact-2', firstName: 'Jane', lastName: 'Smith' },
      ];

      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue(mockContacts as any);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(10);

      const result = await CRMService.listContacts({}, { page: 1, limit: 50 }, adminAccessContext);

      expect(result.contacts).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by stage', async () => {
      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(0);

      await CRMService.listContacts(
        { stage: PipelineStage.CONTACTED },
        { page: 1, limit: 50 },
        adminAccessContext
      );

      expect(prisma.cRMContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: PipelineStage.CONTACTED,
          }),
        })
      );
    });

    it('should filter by contact type', async () => {
      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(0);

      await CRMService.listContacts(
        { contactType: ContactType.LEAD },
        { page: 1, limit: 50 },
        adminAccessContext
      );

      expect(prisma.cRMContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactType: ContactType.LEAD,
          }),
        })
      );
    });

    it('should search across multiple fields', async () => {
      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(0);

      await CRMService.listContacts({ search: 'john' }, { page: 1, limit: 50 }, adminAccessContext);

      expect(prisma.cRMContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
              { phone: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should enforce row-level security for preparers', async () => {
      const preparerAccessContext: CRMAccessContext = {
        userId: 'preparer-1',
        userId: 'clerk-preparer-1',
        userRole: UserRole.TAX_PREPARER,
        preparerId: 'prep-id-1',
      };

      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(0);

      await CRMService.listContacts({}, { page: 1, limit: 50 }, preparerAccessContext);

      expect(prisma.cRMContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedPreparerId: 'prep-id-1',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      vi.mocked(prisma.cRMContact.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cRMContact.count).mockResolvedValue(100);

      await CRMService.listContacts({}, { page: 3, limit: 20 }, adminAccessContext);

      expect(prisma.cRMContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        })
      );
    });
  });

  describe('assignContactToPreparer', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should assign contact to preparer', async () => {
      const updatedContact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-1',
        assignedAt: new Date(),
      };

      vi.mocked(prisma.cRMContact.update).mockResolvedValue(updatedContact as any);

      const result = await CRMService.assignContactToPreparer(
        'contact-1',
        'prep-id-1',
        adminAccessContext
      );

      expect(result.assignedPreparerId).toBe('prep-id-1');
      expect(prisma.cRMContact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: {
          assignedPreparerId: 'prep-id-1',
          assignedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should deny non-admin from assigning', async () => {
      const preparerAccessContext: CRMAccessContext = {
        userId: 'preparer-1',
        userId: 'clerk-preparer-1',
        userRole: UserRole.TAX_PREPARER,
      };

      await expect(
        CRMService.assignContactToPreparer('contact-1', 'prep-id-1', preparerAccessContext)
      ).rejects.toThrow('Only admins can assign contacts');
    });
  });

  describe('updateContactStage', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should update stage and create history record', async () => {
      const existingContact = {
        id: 'contact-1',
        stage: PipelineStage.NEW,
        assignedPreparerId: null,
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 0 },
      };

      const updatedContact = {
        ...existingContact,
        stage: PipelineStage.CONTACTED,
        stageEnteredAt: new Date(),
      };

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(existingContact as any);
      vi.mocked(prisma.cRMContact.update).mockResolvedValue(updatedContact as any);
      vi.mocked(prisma.cRMStageHistory.create).mockResolvedValue({} as any);

      const result = await CRMService.updateContactStage(
        {
          contactId: 'contact-1',
          fromStage: PipelineStage.NEW,
          toStage: PipelineStage.CONTACTED,
          reason: 'Called and left voicemail',
        },
        adminAccessContext
      );

      expect(result.stage).toBe(PipelineStage.CONTACTED);
      expect(prisma.cRMStageHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: 'contact-1',
          fromStage: PipelineStage.NEW,
          toStage: PipelineStage.CONTACTED,
          reason: 'Called and left voicemail',
        }),
      });
    });
  });

  describe('logInteraction', () => {
    it('should log interaction and update lastContactedAt', async () => {
      const mockInteraction = {
        id: 'interaction-1',
        contactId: 'contact-1',
        userId: 'user-1',
        type: InteractionType.PHONE_CALL,
        direction: Direction.OUTBOUND,
        subject: 'Follow-up call',
        body: 'Left voicemail about tax documents',
        duration: 5,
        occurredAt: new Date(),
      };

      vi.mocked(prisma.cRMInteraction.create).mockResolvedValue(mockInteraction as any);
      vi.mocked(prisma.cRMContact.update).mockResolvedValue({} as any);

      const result = await CRMService.logInteraction({
        contactId: 'contact-1',
        userId: 'user-1',
        type: InteractionType.PHONE_CALL,
        direction: Direction.OUTBOUND,
        subject: 'Follow-up call',
        body: 'Left voicemail about tax documents',
        duration: 5,
      });

      expect(result.id).toBe('interaction-1');
      expect(prisma.cRMContact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: { lastContactedAt: expect.any(Date) },
      });
    });
  });

  describe('getContactInteractions', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should return interactions for a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: null,
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 2 },
      };

      const mockInteractions = [
        { id: 'int-1', type: InteractionType.EMAIL, occurredAt: new Date() },
        { id: 'int-2', type: InteractionType.PHONE_CALL, occurredAt: new Date() },
      ];

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.cRMInteraction.findMany).mockResolvedValue(mockInteractions as any);

      const result = await CRMService.getContactInteractions('contact-1', adminAccessContext, 50);

      expect(result).toHaveLength(2);
      expect(prisma.cRMInteraction.findMany).toHaveBeenCalledWith({
        where: { contactId: 'contact-1' },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        include: expect.any(Object),
      });
    });
  });

  describe('getContactStageHistory', () => {
    const adminAccessContext: CRMAccessContext = {
      userId: 'admin-1',
      userId: 'clerk-admin-1',
      userRole: UserRole.ADMIN,
    };

    it('should return stage history for a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: null,
        user: { id: 'user-1', email: 'john@example.com' },
        interactions: [],
        stageHistory: [],
        _count: { interactions: 0 },
      };

      const mockHistory = [
        { id: 'hist-1', fromStage: PipelineStage.NEW, toStage: PipelineStage.CONTACTED },
        { id: 'hist-2', fromStage: PipelineStage.CONTACTED, toStage: PipelineStage.DOCUMENTS },
      ];

      vi.mocked(prisma.cRMContact.findUnique).mockResolvedValue(mockContact as any);
      vi.mocked(prisma.cRMStageHistory.findMany).mockResolvedValue(mockHistory as any);

      const result = await CRMService.getContactStageHistory('contact-1', adminAccessContext);

      expect(result).toHaveLength(2);
      expect(prisma.cRMStageHistory.findMany).toHaveBeenCalledWith({
        where: { contactId: 'contact-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
