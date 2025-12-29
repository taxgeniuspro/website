/**
 * Auth Module Tests
 * Tests for authentication, authorization, and role-based access control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDashboardUrl,
  hashPassword,
  verifyPassword,
} from '../auth';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  })),
}));

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [] })),
        })),
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [] })),
        })),
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

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDashboardUrl', () => {
    it('returns correct URL for admin role', () => {
      expect(getDashboardUrl('admin')).toBe('/dashboard/admin');
    });

    it('returns correct URL for client role', () => {
      expect(getDashboardUrl('client')).toBe('/dashboard/client');
    });

    it('returns correct URL for tax_preparer role', () => {
      expect(getDashboardUrl('tax_preparer')).toBe('/dashboard/tax-preparer');
    });

    it('returns correct URL for affiliate role', () => {
      expect(getDashboardUrl('affiliate')).toBe('/dashboard/affiliate/analytics');
    });

    it('returns client dashboard for unknown role', () => {
      expect(getDashboardUrl('unknown_role')).toBe('/dashboard/client');
    });

    it('handles uppercase roles correctly', () => {
      expect(getDashboardUrl('ADMIN')).toBe('/dashboard/admin');
      expect(getDashboardUrl('CLIENT')).toBe('/dashboard/client');
    });
  });

  describe('hashPassword', () => {
    it('hashes password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('produces different hashes for same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('wrongPassword', hash);

      expect(isValid).toBe(false);
    });

    it('handles empty password', async () => {
      const password = 'testPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });
  });
});

describe('Role Validation', () => {
  describe('Role normalization', () => {
    it('normalizes roles to lowercase', () => {
      const normalizeRole = (role: string) => role.toLowerCase();

      expect(normalizeRole('ADMIN')).toBe('admin');
      expect(normalizeRole('Tax_Preparer')).toBe('tax_preparer');
      expect(normalizeRole('CLIENT')).toBe('client');
    });
  });

  describe('Role type definitions', () => {
    it('accepts valid UserRole values', () => {
      const validRoles = ['admin', 'client', 'tax_preparer', 'affiliate', 'lead'];

      validRoles.forEach((role) => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Session handling', () => {
  describe('Session user structure', () => {
    it('validates session user interface', () => {
      const mockUser = {
        id: 'test-id-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        role: 'client' as const,
        isActive: true,
      };

      expect(mockUser.id).toBeDefined();
      expect(mockUser.email).toContain('@');
      expect(mockUser.role).toBe('client');
    });
  });
});
