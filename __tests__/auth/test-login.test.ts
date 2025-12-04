import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/auth/test-login/route';
import { NextRequest } from 'next/server';

/**
 * Authentication Flow Tests
 *
 * Tests the test authentication endpoint to ensure:
 * - Valid credentials are accepted
 * - Invalid credentials are rejected
 * - Proper role-based redirects
 * - Error handling
 */

// Mock Clerk client
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() => ({
    users: {
      getUserList: vi.fn(() => Promise.resolve({ data: [] })),
    },
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Test Login Authentication Flow', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3005/api/auth/test-login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('POST /api/auth/test-login', () => {
    it('should authenticate admin user successfully', async () => {
      mockRequest = createMockRequest({
        email: 'admin@test.com',
        password: 'admin123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('super_admin');
      expect(data.user.email).toBe('admin@test.com');
      expect(data.redirectUrl).toBe('/dashboard/admin');
    });

    it('should authenticate tax preparer successfully', async () => {
      mockRequest = createMockRequest({
        email: 'preparer@test.com',
        password: 'preparer123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('tax_preparer');
      expect(data.redirectUrl).toBe('/dashboard/tax-preparer');
    });

    it('should authenticate affiliate successfully', async () => {
      mockRequest = createMockRequest({
        email: 'affiliate@test.com',
        password: 'affiliate123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('affiliate');
      expect(data.redirectUrl).toBe('/dashboard/affiliate');
    });

    it('should authenticate client successfully', async () => {
      mockRequest = createMockRequest({
        email: 'client@test.com',
        password: 'client123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('client');
      expect(data.redirectUrl).toBe('/dashboard/client');
    });

    it('should authenticate lead successfully', async () => {
      mockRequest = createMockRequest({
        email: 'lead@test.com',
        password: 'lead123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('lead');
      expect(data.redirectUrl).toBe('/dashboard/lead');
    });

    it('should reject invalid email', async () => {
      mockRequest = createMockRequest({
        email: 'invalid-email',
        password: 'password123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should reject password less than 6 characters', async () => {
      mockRequest = createMockRequest({
        email: 'test@test.com',
        password: '12345',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should reject wrong password', async () => {
      mockRequest = createMockRequest({
        email: 'admin@test.com',
        password: 'wrongpassword',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      mockRequest = createMockRequest({
        email: 'nonexistent@test.com',
        password: 'password123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should handle missing email field', async () => {
      mockRequest = createMockRequest({
        password: 'password123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should handle missing password field', async () => {
      mockRequest = createMockRequest({
        email: 'test@test.com',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should handle empty request body', async () => {
      mockRequest = createMockRequest({});

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('GET /api/auth/test-login', () => {
    it('should return test accounts list in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toBeDefined();
      expect(data.accounts.length).toBeGreaterThan(0);
      expect(data.accounts[0].email).toBeDefined();
      expect(data.accounts[0].role).toBeDefined();
      expect(data.note).toContain('test accounts');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose passwords in GET response', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      data.accounts.forEach((account: { password?: string }) => {
        expect(account.password).toBeUndefined();
      });

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should block GET endpoint in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not available in production');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});
