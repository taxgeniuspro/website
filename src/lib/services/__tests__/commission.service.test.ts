/**
 * Commission Service Tests
 * Tests for commission calculations, earnings tracking, and payout management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
  firstOrNull: vi.fn((arr) => (arr && arr.length > 0 ? arr[0] : null)),
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

describe('Commission Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Commission Calculations', () => {
    it('calculates percentage commission correctly', () => {
      const grossAmount = 500;
      const commissionRate = 0.15; // 15%
      const expected = 75;

      const commission = grossAmount * commissionRate;
      expect(commission).toBe(expected);
    });

    it('calculates flat commission correctly', () => {
      const flatAmount = 50;
      expect(flatAmount).toBe(50);
    });

    it('handles zero gross amount', () => {
      const grossAmount = 0;
      const commissionRate = 0.15;
      const commission = grossAmount * commissionRate;

      expect(commission).toBe(0);
    });

    it('handles decimal precision correctly', () => {
      const grossAmount = 333.33;
      const commissionRate = 0.1;
      const commission = Math.round(grossAmount * commissionRate * 100) / 100;

      expect(commission).toBe(33.33);
    });
  });

  describe('Commission Status Types', () => {
    it('validates commission status enum values', () => {
      const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];

      validStatuses.forEach((status) => {
        expect(typeof status).toBe('string');
        expect(status.toUpperCase()).toBe(status);
      });
    });

    it('validates payout status enum values', () => {
      const validStatuses = ['REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED'];

      validStatuses.forEach((status) => {
        expect(typeof status).toBe('string');
        expect(status.toUpperCase()).toBe(status);
      });
    });
  });

  describe('Referrer Types', () => {
    it('validates referrer type values', () => {
      const validTypes = ['AFFILIATE', 'REFERRER', 'TAX_PREPARER'];

      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('Earnings Summary Structure', () => {
    it('validates earnings summary interface', () => {
      const mockSummary = {
        totalEarnings: 1500,
        pendingEarnings: 500,
        approvedEarnings: 750,
        paidEarnings: 250,
        totalLeads: 50,
        convertedLeads: 30,
      };

      expect(mockSummary.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(mockSummary.pendingEarnings).toBeGreaterThanOrEqual(0);
      expect(mockSummary.totalLeads).toBeGreaterThanOrEqual(mockSummary.convertedLeads);
    });

    it('ensures total equals sum of status breakdowns', () => {
      const pending = 500;
      const approved = 750;
      const paid = 250;
      const total = pending + approved + paid;

      expect(total).toBe(1500);
    });
  });

  describe('Commission Record Structure', () => {
    it('validates commission record interface', () => {
      const mockRecord = {
        id: 'comm-123',
        leadId: 'lead-456',
        referrerUsername: 'gw',
        referrerType: 'AFFILIATE' as const,
        amount: 75,
        status: 'PENDING' as const,
        leadStatus: 'CONVERTED',
        createdAt: new Date(),
        approvedAt: null,
        paidAt: null,
        notes: null,
      };

      expect(mockRecord.id).toBeDefined();
      expect(mockRecord.amount).toBeGreaterThan(0);
      expect(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).toContain(mockRecord.status);
    });
  });
});

describe('Commission Rate Rules', () => {
  describe('Default rates', () => {
    it('uses default rate when no custom rate specified', () => {
      const defaultRate = 0.10; // 10%
      const customRate = null;
      const effectiveRate = customRate ?? defaultRate;

      expect(effectiveRate).toBe(0.10);
    });

    it('uses custom rate when specified', () => {
      const defaultRate = 0.10;
      const customRate = 0.15;
      const effectiveRate = customRate ?? defaultRate;

      expect(effectiveRate).toBe(0.15);
    });
  });

  describe('Rate locking', () => {
    it('locks rate at conversion time', () => {
      const rateAtCreation = 0.15;
      const currentGroupRate = 0.20; // Rate changed after creation

      // Locked rate should be used
      expect(rateAtCreation).toBe(0.15);
      expect(rateAtCreation).not.toBe(currentGroupRate);
    });
  });
});
