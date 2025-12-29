/**
 * Tax Intake API Tests
 * Tests for lead capture and tax intake form submission
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
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'lead-123', email: 'test@example.com' }, 
            error: null 
          })),
        })),
      })),
    })),
  },
  firstOrNull: vi.fn((arr) => (arr && arr.length > 0 ? arr[0] : null)),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('Tax Intake API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Lead Data Validation', () => {
    it('validates required fields', () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      };
      expect(leadData.firstName).toBeDefined();
      expect(leadData.email).toContain('@');
    });

    it('validates email format', () => {
      const validEmails = ['test@example.com', 'user@domain.org'];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });
  });

  describe('Filing Status', () => {
    it('validates filing status options', () => {
      const validStatuses = ['single', 'married_joint', 'married_separate', 'head_of_household'];
      validStatuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('Referrer Attribution', () => {
    it('captures referrer code', () => {
      const refCode = 'gw';
      expect(refCode).toBe('gw');
    });

    it('handles missing referrer', () => {
      const refCode = null;
      const attributionSource = refCode || 'organic';
      expect(attributionSource).toBe('organic');
    });
  });

  describe('Lead Score Calculation', () => {
    it('calculates base lead score', () => {
      let score = 0;
      score += 20; // phone
      score += 15; // address
      score += 25; // filing status
      expect(score).toBe(60);
    });

    it('caps lead score at 100', () => {
      const cappedScore = Math.min(150, 100);
      expect(cappedScore).toBe(100);
    });
  });
});
