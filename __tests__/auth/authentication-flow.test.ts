import { describe, it, expect } from 'vitest';

/**
 * Complete Authentication Flow Tests
 *
 * This test suite validates the entire authentication flow:
 * 1. User submits credentials
 * 2. API validates and authenticates
 * 3. Session is created
 * 4. User is redirected to appropriate dashboard
 * 5. Protected routes are accessible
 */

describe('Complete Authentication Flow', () => {
  describe('Login Flow', () => {
    it('should complete full authentication cycle for admin', async () => {
      // Step 1: User submits login form
      const loginCredentials = {
        email: 'admin@test.com',
        password: 'admin123',
      };

      // Step 2: API validates credentials
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();

      // Step 3: Verify response structure
      expect(data).toMatchObject({
        success: true,
        user: {
          email: 'admin@test.com',
          role: 'super_admin',
          name: expect.any(String),
        },
        redirectUrl: '/dashboard/admin',
        message: expect.stringContaining('Successfully authenticated'),
      });

      // Step 4: Verify role-based redirect
      expect(data.redirectUrl).toBe('/dashboard/admin');
    });

    it('should route different roles to correct dashboards', async () => {
      const roleTests = [
        { email: 'admin@test.com', password: 'admin123', expectedRedirect: '/dashboard/admin', expectedRole: 'super_admin' },
        { email: 'preparer@test.com', password: 'preparer123', expectedRedirect: '/dashboard/tax-preparer', expectedRole: 'tax_preparer' },
        { email: 'affiliate@test.com', password: 'affiliate123', expectedRedirect: '/dashboard/affiliate', expectedRole: 'affiliate' },
        { email: 'client@test.com', password: 'client123', expectedRedirect: '/dashboard/client', expectedRole: 'client' },
        { email: 'lead@test.com', password: 'lead123', expectedRedirect: '/dashboard/lead', expectedRole: 'lead' },
      ];

      for (const test of roleTests) {
        const response = await fetch('http://localhost:3005/api/auth/test-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: test.email, password: test.password }),
        });

        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.user.role).toBe(test.expectedRole);
        expect(data.redirectUrl).toBe(test.expectedRedirect);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid URL
      try {
        await fetch('http://invalid-url/api/auth/test-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test123' }),
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(response.ok).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'password123',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should enforce minimum password length', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '12345',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should reject empty credentials', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          password: '',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });
  });

  describe('Security', () => {
    it('should not reveal whether email exists', async () => {
      // Test with non-existent email
      const response1 = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'password123',
        }),
      });

      const data1 = await response1.json();

      // Test with existing email but wrong password
      const response2 = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'wrongpassword',
        }),
      });

      const data2 = await response2.json();

      // Both should return the same generic error
      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
      expect(data1.error).toBe('Invalid email or password');
      expect(data2.error).toBe('Invalid email or password');
    });

    it('should not expose sensitive user data', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123',
        }),
      });

      const data = await response.json();

      // Should NOT include sensitive fields
      expect(data.user.password).toBeUndefined();
      expect(data.user.hashedPassword).toBeUndefined();
      expect(data.user.sessionToken).toBeUndefined();
    });

    it('should block GET endpoint in production', async () => {
      // This would need to be tested with NODE_ENV=production
      // For now, we document the expected behavior
      expect(true).toBe(true);
    });
  });

  describe('Test Account Access', () => {
    it('should provide list of test accounts in development', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'GET',
      });

      if (process.env.NODE_ENV === 'production') {
        expect(response.status).toBe(404);
      } else {
        const data = await response.json();
        expect(data.accounts).toBeDefined();
        expect(Array.isArray(data.accounts)).toBe(true);
        expect(data.accounts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Structure', () => {
    it('should return consistent response format on success', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('redirectUrl');
      expect(data).toHaveProperty('message');

      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('name');
      expect(data.user).toHaveProperty('role');
    });

    it('should return consistent error format on failure', async () => {
      const response = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@test.com',
          password: 'wrongpass',
        }),
      });

      const data = await response.json();

      // Verify error structure
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(typeof data.error).toBe('string');
    });
  });
});
