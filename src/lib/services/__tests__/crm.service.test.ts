/**
 * CRM Service Unit Tests (Epic 7 - Story 7.1)
 *
 * Tests for CRM contact management service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMService } from '../crm.service';
import { db } from '@/lib/db';
import type { CRMAccessContext } from '@/types/crm';

// Local type definitions (replacing @prisma/client)
type ContactType = 'LEAD' | 'CLIENT' | 'PROSPECT' | 'REFERRAL' | 'FORMER_CLIENT';
type PipelineStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'DOCUMENTS' | 'REVIEW' | 'FILED' | 'COMPLETED' | 'LOST';
type UserRole = 'ADMIN' | 'TAX_PREPARER' | 'AFFILIATE' | 'CUSTOMER';
type InteractionType = 'EMAIL' | 'PHONE_CALL' | 'SMS' | 'MEETING' | 'NOTE' | 'TASK' | 'OTHER';
type Direction = 'INBOUND' | 'OUTBOUND';

// Mock Supabase db
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(),
  },
  firstOrNull: vi.fn((data) => (data && data.length > 0 ? data[0] : null)),
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

// Helper to create chainable mock
const createChainableMock = (returnValue: unknown, options?: { error?: Error }) => {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'or', 'and', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'skip', 'take', 'contains', 'ilike'];

  chainMethods.forEach(method => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });

  // Final methods return the data
  if (options?.error) {
    mock.single = vi.fn().mockResolvedValue({ data: null, error: options.error });
    mock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: options.error });
  } else {
    mock.single = vi.fn().mockResolvedValue({ data: returnValue, error: null });
    mock.maybeSingle = vi.fn().mockResolvedValue({ data: returnValue, error: null });
  }

  // For count queries
  mock.select = vi.fn().mockImplementation((columns?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.count === 'exact') {
      return { ...mock, then: vi.fn().mockResolvedValue({ count: typeof returnValue === 'number' ? returnValue : 0, error: null }) };
    }
    return mock;
  });

  return mock;
};

describe('CRMService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a new contact successfully', async () => {
      const mockContact = {
        id: 'contact-1',
        clerkUserId: 'clerk-user-1',
        contactType: 'CLIENT' as ContactType,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        company: null,
        filingStatus: null,
        dependents: null,
        previousYearAGI: null,
        taxYear: null,
        stage: 'NEW' as PipelineStage,
        stageEnteredAt: new Date().toISOString(),
        source: 'manual',
        assignedPreparerId: null,
        assignedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastContactedAt: null,
      };

      const contactMock = createChainableMock(mockContact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.createContact({
        clerkUserId: 'clerk-user-1',
        contactType: 'CLIENT' as ContactType,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        source: 'manual',
      });

      expect(result).toEqual(mockContact);
      expect(db.from).toHaveBeenCalledWith('crm_contacts');
    });

    it('should throw error on duplicate email', async () => {
      const contactMock = createChainableMock(null, { error: new Error('Unique constraint failed on the fields: (`email`)') });
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await expect(
        CRMService.createContact({
          contactType: 'CLIENT' as ContactType,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'duplicate@example.com',
        })
      ).rejects.toThrow('Failed to create contact');
    });
  });

  describe('getContactById', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    const preparerAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-preparer-1',
      userRole: 'TAX_PREPARER' as UserRole,
      preparerId: 'prep-id-1',
    };

    it.skip('should return contact for admin', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        assignedPreparerId: 'prep-id-2',
      };

      const contactMock = createChainableMock(mockContact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.getContactById('contact-1', adminAccessContext);

      expect(result).toEqual(mockContact);
      expect(db.from).toHaveBeenCalledWith('crm_contacts');
    });

    it.skip('should return contact for assigned preparer', async () => {
      const mockContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        assignedPreparerId: 'prep-id-1',
      };

      const contactMock = createChainableMock(mockContact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.getContactById('contact-1', preparerAccessContext);

      expect(result).toEqual(mockContact);
    });

    it.skip('should deny access for non-assigned preparer', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-999', // Different preparer
      };

      const contactMock = createChainableMock(mockContact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await expect(CRMService.getContactById('contact-1', preparerAccessContext)).rejects.toThrow(
        'Access denied: Contact not assigned to you'
      );
    });

    it('should throw error if contact not found', async () => {
      const contactMock = createChainableMock(null);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await expect(CRMService.getContactById('nonexistent', adminAccessContext)).rejects.toThrow(
        'Contact not found'
      );
    });
  });

  describe('updateContact', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it.skip('should update contact successfully', async () => {
      const existingContact = {
        id: 'contact-1',
        assignedPreparerId: null,
      };

      const updatedContact = {
        ...existingContact,
        phone: '555-9999',
        company: 'Acme Corp',
      };

      let callCount = 0;
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          callCount++;
          if (callCount === 1) {
            // First call for findUnique
            return createChainableMock(existingContact) as ReturnType<typeof db.from>;
          }
          // Second call for update
          return createChainableMock(updatedContact) as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.updateContact(
        'contact-1',
        { phone: '555-9999', company: 'Acme Corp' },
        adminAccessContext
      );

      expect(result.phone).toBe('555-9999');
      expect(result.company).toBe('Acme Corp');
    });

    it.skip('should enforce access control', async () => {
      const preparerAccessContext: CRMAccessContext = {
        clerkUserId: 'clerk-preparer-1',
        userRole: 'TAX_PREPARER' as UserRole,
        preparerId: 'prep-id-1',
      };

      const contact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-999', // Different preparer
      };

      const contactMock = createChainableMock(contact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await expect(
        CRMService.updateContact('contact-1', { phone: '555-1111' }, preparerAccessContext)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteContact', () => {
    it('should allow admin to delete contact', async () => {
      const adminAccessContext: CRMAccessContext = {
        clerkUserId: 'clerk-admin-1',
        userRole: 'ADMIN' as UserRole,
      };

      const contactMock = createChainableMock({});
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.deleteContact('contact-1', adminAccessContext);

      expect(result.deleted).toBe(true);
    });

    it('should deny non-admin from deleting', async () => {
      const preparerAccessContext: CRMAccessContext = {
        clerkUserId: 'clerk-preparer-1',
        userRole: 'TAX_PREPARER' as UserRole,
      };

      await expect(CRMService.deleteContact('contact-1', preparerAccessContext)).rejects.toThrow(
        'Only admins can delete contacts'
      );
    });
  });

  describe('listContacts', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it.skip('should list contacts with pagination', async () => {
      const mockContacts = [
        { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
        { id: 'contact-2', firstName: 'Jane', lastName: 'Smith' },
      ];

      // Mock for both data and count queries
      let queryType = 'data';
      const contactMock = {
        select: vi.fn().mockImplementation((columns?: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact' && opts?.head) {
            queryType = 'count';
            return {
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ count: 10, error: null }),
            };
          }
          queryType = 'data';
          return contactMock;
        }),
        eq: vi.fn().mockReturnValue(contactMock),
        order: vi.fn().mockReturnValue(contactMock),
        range: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
      };

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.listContacts({}, { page: 1, limit: 50 }, adminAccessContext);

      expect(result.contacts).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by stage', async () => {
      const contactMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await CRMService.listContacts(
        { stage: 'CONTACTED' as PipelineStage },
        { page: 1, limit: 50 },
        adminAccessContext
      );

      expect(contactMock.eq).toHaveBeenCalledWith('stage', 'CONTACTED');
    });

    it('should filter by contact type', async () => {
      const contactMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await CRMService.listContacts(
        { contactType: 'LEAD' as ContactType },
        { page: 1, limit: 50 },
        adminAccessContext
      );

      expect(contactMock.eq).toHaveBeenCalledWith('contactType', 'LEAD');
    });

    it('should enforce row-level security for preparers', async () => {
      const preparerAccessContext: CRMAccessContext = {
        clerkUserId: 'clerk-preparer-1',
        userRole: 'TAX_PREPARER' as UserRole,
        preparerId: 'prep-id-1',
      };

      const contactMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await CRMService.listContacts({}, { page: 1, limit: 50 }, preparerAccessContext);

      expect(contactMock.eq).toHaveBeenCalledWith('assignedPreparerId', 'prep-id-1');
    });
  });

  describe('assignContactToPreparer', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it('should assign contact to preparer', async () => {
      const updatedContact = {
        id: 'contact-1',
        assignedPreparerId: 'prep-id-1',
        assignedAt: new Date().toISOString(),
      };

      const contactMock = createChainableMock(updatedContact);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return contactMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.assignContactToPreparer(
        'contact-1',
        'prep-id-1',
        adminAccessContext
      );

      expect(result.assignedPreparerId).toBe('prep-id-1');
    });

    it('should deny non-admin from assigning', async () => {
      const preparerAccessContext: CRMAccessContext = {
        clerkUserId: 'clerk-preparer-1',
        userRole: 'TAX_PREPARER' as UserRole,
      };

      await expect(
        CRMService.assignContactToPreparer('contact-1', 'prep-id-1', preparerAccessContext)
      ).rejects.toThrow('Only admins can assign contacts');
    });
  });

  describe('updateContactStage', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it.skip('should update stage and create history record', async () => {
      const existingContact = {
        id: 'contact-1',
        stage: 'NEW' as PipelineStage,
        assignedPreparerId: null,
      };

      const updatedContact = {
        ...existingContact,
        stage: 'CONTACTED' as PipelineStage,
        stageEnteredAt: new Date().toISOString(),
      };

      let callCount = 0;
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          callCount++;
          if (callCount === 1) {
            return createChainableMock(existingContact) as ReturnType<typeof db.from>;
          }
          return createChainableMock(updatedContact) as ReturnType<typeof db.from>;
        }
        if (table === 'crm_stage_history') {
          return createChainableMock({}) as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.updateContactStage(
        {
          contactId: 'contact-1',
          fromStage: 'NEW' as PipelineStage,
          toStage: 'CONTACTED' as PipelineStage,
          reason: 'Called and left voicemail',
        },
        adminAccessContext
      );

      expect(result.stage).toBe('CONTACTED');
    });
  });

  describe('logInteraction', () => {
    it('should log interaction and update lastContactedAt', async () => {
      const mockInteraction = {
        id: 'interaction-1',
        contactId: 'contact-1',
        clerkUserId: 'user-1',
        type: 'PHONE_CALL' as InteractionType,
        direction: 'OUTBOUND' as Direction,
        subject: 'Follow-up call',
        body: 'Left voicemail about tax documents',
        duration: 5,
        occurredAt: new Date().toISOString(),
      };

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_interactions') {
          return createChainableMock(mockInteraction) as ReturnType<typeof db.from>;
        }
        if (table === 'crm_contacts') {
          return createChainableMock({}) as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.logInteraction({
        contactId: 'contact-1',
        clerkUserId: 'user-1',
        type: 'PHONE_CALL' as InteractionType,
        direction: 'OUTBOUND' as Direction,
        subject: 'Follow-up call',
        body: 'Left voicemail about tax documents',
        duration: 5,
      });

      expect(result.id).toBe('interaction-1');
    });
  });

  describe('getContactInteractions', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it.skip('should return interactions for a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: null,
      };

      const mockInteractions = [
        { id: 'int-1', type: 'EMAIL' as InteractionType, occurredAt: new Date().toISOString() },
        { id: 'int-2', type: 'PHONE_CALL' as InteractionType, occurredAt: new Date().toISOString() },
      ];

      let tableQueryCount = 0;
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return createChainableMock(mockContact) as ReturnType<typeof db.from>;
        }
        if (table === 'crm_interactions') {
          tableQueryCount++;
          const mock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockInteractions, error: null }),
          };
          return mock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.getContactInteractions('contact-1', adminAccessContext, 50);

      expect(result).toHaveLength(2);
    });
  });

  describe('getContactStageHistory', () => {
    const adminAccessContext: CRMAccessContext = {
      clerkUserId: 'clerk-admin-1',
      userRole: 'ADMIN' as UserRole,
    };

    it.skip('should return stage history for a contact', async () => {
      const mockContact = {
        id: 'contact-1',
        assignedPreparerId: null,
      };

      const mockHistory = [
        { id: 'hist-1', fromStage: 'NEW', toStage: 'CONTACTED' },
        { id: 'hist-2', fromStage: 'CONTACTED', toStage: 'DOCUMENTS' },
      ];

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'crm_contacts') {
          return createChainableMock(mockContact) as ReturnType<typeof db.from>;
        }
        if (table === 'crm_stage_history') {
          const mock = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockHistory, error: null }),
          };
          return mock as unknown as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await CRMService.getContactStageHistory('contact-1', adminAccessContext);

      expect(result).toHaveLength(2);
    });
  });
});
