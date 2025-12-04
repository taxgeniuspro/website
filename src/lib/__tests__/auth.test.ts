import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserRole,
  hasRole,
  isAdmin,
  requireAuth,
  requireRole,
  getDashboardUrl,
  updateUserRole,
  type UserRole,
} from '../auth';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: {
    users: {
      updateUserMetadata: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCurrentUser = currentUser as ReturnType<typeof vi.fn>;

describe('Auth Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role from Clerk metadata', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'client' },
      });

      const role = await getUserRole();
      expect(role).toBe('client');
    });

    it('should return null when user is not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      const role = await getUserRole();
      expect(role).toBeNull();
    });

    it('should return null when user has no role in metadata', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: {},
      });

      const role = await getUserRole();
      expect(role).toBeNull();
    });

    it('should handle all valid role types', async () => {
      const roles: UserRole[] = [
        'super_admin',
        'admin',
        'lead',
        'client',
        'tax_preparer',
        'affiliate',
      ];

      for (const expectedRole of roles) {
        mockCurrentUser.mockResolvedValue({
          id: 'user_123',
          publicMetadata: { role: expectedRole },
        });

        const role = await getUserRole();
        expect(role).toBe(expectedRole);
      }
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'tax_preparer' },
      });

      const result = await hasRole('tax_preparer');
      expect(result).toBe(true);
    });

    it('should return false when user has different role', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'client' },
      });

      const result = await hasRole('tax_preparer');
      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      const result = await hasRole('client');
      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true when user is admin or super_admin', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'admin' },
      });

      let result = await isAdmin();
      expect(result).toBe(true);

      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'super_admin' },
      });

      result = await isAdmin();
      expect(result).toBe(true);
    });

    it('should return false when user is not admin', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'client' },
      });

      const result = await isAdmin();
      expect(result).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user_123',
        publicMetadata: { role: 'client' },
      };
      mockCurrentUser.mockResolvedValue(mockUser);

      const user = await requireAuth();
      expect(user).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });
  });

  describe('requireRole', () => {
    it('should return user and role when user has required role', async () => {
      const mockUser = {
        id: 'user_123',
        publicMetadata: { role: 'tax_preparer' },
      };
      mockCurrentUser.mockResolvedValue(mockUser);

      const result = await requireRole('tax_preparer');
      expect(result.user).toEqual(mockUser);
      expect(result.role).toBe('tax_preparer');
    });

    it('should throw error when user lacks required role', async () => {
      mockCurrentUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'client' },
      });

      await expect(requireRole('tax_preparer')).rejects.toThrow('Insufficient permissions');
    });

    it('should throw error when not authenticated', async () => {
      mockCurrentUser.mockResolvedValue(null);

      await expect(requireRole('client')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getDashboardUrl', () => {
    it('should return correct dashboard URL for each role', () => {
      expect(getDashboardUrl('super_admin')).toBe('/dashboard/admin');
      expect(getDashboardUrl('admin')).toBe('/dashboard/admin');
      expect(getDashboardUrl('lead')).toBe('/dashboard/lead');
      expect(getDashboardUrl('client')).toBe('/dashboard/client');
      expect(getDashboardUrl('tax_preparer')).toBe('/dashboard/tax-preparer');
      expect(getDashboardUrl('affiliate')).toBe('/dashboard/affiliate');
    });
  });

  describe('updateUserRole', () => {
    it('should update user metadata with new role', async () => {
      const mockUpdateMetadata = vi.fn().mockResolvedValue({});

      vi.mocked(clerkClient).users = {
        updateUserMetadata: mockUpdateMetadata,
      } as any;

      await updateUserRole('user_123', 'tax_preparer');

      expect(mockUpdateMetadata).toHaveBeenCalledWith('user_123', {
        publicMetadata: { role: 'tax_preparer' },
      });
    });
  });
});
