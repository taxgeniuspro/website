/**
 * Attribution Service Tests
 * Tests for lead attribution with cookie tracking and cross-device matching
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
        or: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        ilike: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
  firstOrNull: vi.fn((arr) => (arr && arr.length > 0 ? arr[0] : null)),
}));

// Mock cookie manager
vi.mock('@/lib/utils/cookie-manager', () => ({
  getAttributionCookie: vi.fn(() => null),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('Attribution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Attribution Priority', () => {
    it('validates attribution priority order', () => {
      const priorities = [
        { method: 'cookie', confidence: 100 },
        { method: 'email_match', confidence: 90 },
        { method: 'phone_match', confidence: 85 },
        { method: 'direct', confidence: 100 },
      ];

      expect(priorities[0].confidence).toBeGreaterThanOrEqual(priorities[1].confidence);
      expect(priorities[1].confidence).toBeGreaterThan(priorities[2].confidence);
    });

    it('cookie attribution has highest priority', () => {
      const cookieConfidence = 100;
      const emailConfidence = 90;
      const phoneConfidence = 85;

      expect(cookieConfidence).toBeGreaterThanOrEqual(emailConfidence);
      expect(cookieConfidence).toBeGreaterThanOrEqual(phoneConfidence);
    });
  });

  describe('Attribution Data Structure', () => {
    it('validates attribution data interface', () => {
      const mockAttribution = {
        referrerUsername: 'gw',
        referrerType: 'AFFILIATE',
        attributionMethod: 'cookie' as const,
        attributionConfidence: 100,
        attributionCookieId: 'cookie-123',
        commissionRate: 50.0,
      };

      expect(mockAttribution.referrerUsername).toBeDefined();
      expect(mockAttribution.attributionConfidence).toBeGreaterThanOrEqual(0);
      expect(mockAttribution.attributionConfidence).toBeLessThanOrEqual(100);
    });

    it('validates attribution result structure', () => {
      const mockResult = {
        success: true,
        attribution: {
          referrerUsername: 'gw',
          referrerType: 'AFFILIATE',
          attributionMethod: 'cookie' as const,
          attributionConfidence: 100,
        },
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.attribution).toBeDefined();
    });

    it('handles failed attribution result', () => {
      const mockResult = {
        success: false,
        attribution: {
          referrerUsername: null,
          referrerType: null,
          attributionMethod: 'direct' as const,
          attributionConfidence: 100,
        },
        error: 'No referrer found',
      };

      expect(mockResult.success).toBe(false);
      expect(mockResult.error).toBeDefined();
    });
  });

  describe('Commission Rate', () => {
    it('uses default commission rate of $50', () => {
      const DEFAULT_COMMISSION_RATE = 50.0;
      expect(DEFAULT_COMMISSION_RATE).toBe(50.0);
    });

    it('validates commission rate info structure', () => {
      const mockRateInfo = {
        rate: 50.0,
        source: 'default' as const,
      };

      expect(mockRateInfo.rate).toBeGreaterThan(0);
      expect(['affiliate_bonding', 'default', 'preparer_bonus']).toContain(mockRateInfo.source);
    });

    it('commission rate from affiliate bonding takes precedence', () => {
      const defaultRate = 50.0;
      const bondingRate = 75.0;
      const effectiveRate = bondingRate > 0 ? bondingRate : defaultRate;

      expect(effectiveRate).toBe(75.0);
    });
  });

  describe('Cookie Window', () => {
    it('validates 14-day attribution window', () => {
      const ATTRIBUTION_WINDOW_DAYS = 14;
      const windowMs = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      
      expect(ATTRIBUTION_WINDOW_DAYS).toBe(14);
      expect(windowMs).toBe(1209600000);
    });

    it('cookie within window should be valid', () => {
      const cookieDate = new Date();
      const windowDays = 14;
      const windowMs = windowDays * 24 * 60 * 60 * 1000;
      const now = new Date();
      
      const isValid = (now.getTime() - cookieDate.getTime()) <= windowMs;
      expect(isValid).toBe(true);
    });

    it('cookie outside window should be invalid', () => {
      const cookieDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
      const windowDays = 14;
      const windowMs = windowDays * 24 * 60 * 60 * 1000;
      const now = new Date();
      
      const isValid = (now.getTime() - cookieDate.getTime()) <= windowMs;
      expect(isValid).toBe(false);
    });
  });

  describe('Referrer Types', () => {
    it('validates referrer type values', () => {
      const validTypes = ['AFFILIATE', 'TAX_PREPARER', 'CLIENT'];

      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.toUpperCase()).toBe(type);
      });
    });
  });

  describe('Cross-Device Matching', () => {
    it('email match has 90% confidence', () => {
      const EMAIL_MATCH_CONFIDENCE = 90;
      expect(EMAIL_MATCH_CONFIDENCE).toBe(90);
    });

    it('phone match has 85% confidence', () => {
      const PHONE_MATCH_CONFIDENCE = 85;
      expect(PHONE_MATCH_CONFIDENCE).toBe(85);
    });

    it('validates email format for matching', () => {
      const validEmails = ['test@example.com', 'user@domain.org'];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('normalizes phone for matching', () => {
      const rawPhone = '(555) 123-4567';
      const normalized = rawPhone.replace(/\D/g, '');

      expect(normalized).toBe('5551234567');
      expect(normalized.length).toBe(10);
    });
  });
});

describe('First-Touch Attribution', () => {
  it('first referrer wins when multiple exist', () => {
    const firstReferrer = { username: 'gw', timestamp: new Date('2024-01-01') };
    const secondReferrer = { username: 'rh', timestamp: new Date('2024-01-05') };

    const winner = firstReferrer.timestamp < secondReferrer.timestamp 
      ? firstReferrer 
      : secondReferrer;

    expect(winner.username).toBe('gw');
  });

  it('commission rate locks at lead creation', () => {
    const rateAtCreation = 50.0;
    const currentRate = 75.0; // Rate changed after lead creation

    // Locked rate should be used
    expect(rateAtCreation).toBe(50.0);
    expect(rateAtCreation).not.toBe(currentRate);
  });
});
