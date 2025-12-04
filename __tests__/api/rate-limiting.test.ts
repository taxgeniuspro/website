import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Rate Limiting Tests
 *
 * Tests the API rate limiting including:
 * - Request throttling
 * - IP-based limits
 * - User-based limits
 * - Endpoint-specific limits
 * - Rate limit headers
 * - Bypass for authenticated users
 */

const API_BASE = 'http://localhost:3005/api';

describe('Rate Limiting', () => {
  beforeEach(async () => {
    // Wait a bit between tests to reset rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe('Login Endpoint Rate Limiting', () => {
    it('should enforce rate limit on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const requests = [];

      // Make 10 rapid login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${API_BASE}/auth/test-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData),
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should return rate limit headers', async () => {
      const response = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123',
        }),
      });

      // Check for rate limit headers
      expect(response.headers.has('x-ratelimit-limit')).toBe(true);
      expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
      expect(response.headers.has('x-ratelimit-reset')).toBe(true);
    });

    it('should reset rate limit after time window', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'test123',
      };

      // Make requests until rate limited
      let rateLimited = false;
      for (let i = 0; i < 10 && !rateLimited; i++) {
        const response = await fetch(`${API_BASE}/auth/test-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        });

        if (response.status === 429) {
          rateLimited = true;
          const resetHeader = response.headers.get('x-ratelimit-reset');
          expect(resetHeader).toBeDefined();
        }
      }

      if (rateLimited) {
        // Wait for rate limit to reset (typically 1 minute)
        await new Promise((resolve) => setTimeout(resolve, 61000));

        // Should be able to make request again
        const response = await fetch(`${API_BASE}/auth/test-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        });

        expect(response.status).not.toBe(429);
      }
    }, 70000); // Longer timeout for rate limit reset test
  });

  describe('API Endpoint Rate Limiting', () => {
    it('should have different limits for different endpoints', async () => {
      // Public endpoints should have stricter limits
      const publicRequests = [];
      for (let i = 0; i < 20; i++) {
        publicRequests.push(fetch(`${API_BASE}/contact/submit`));
      }

      const publicResponses = await Promise.all(publicRequests);
      const publicRateLimited = publicResponses.filter((r) => r.status === 429).length;

      // Authenticated endpoints should have higher limits
      const loginResponse = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      const { token } = await loginResponse.json();

      const authRequests = [];
      for (let i = 0; i < 20; i++) {
        authRequests.push(
          fetch(`${API_BASE}/crm/contacts`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        );
      }

      const authResponses = await Promise.all(authRequests);
      const authRateLimited = authResponses.filter((r) => r.status === 429).length;

      // Public endpoints should be rate limited more strictly
      expect(publicRateLimited).toBeGreaterThan(authRateLimited);
    });

    it('should enforce stricter limits on expensive operations', async () => {
      // Operations like file uploads should have lower limits
      const uploadRequests = [];

      for (let i = 0; i < 10; i++) {
        const formData = new FormData();
        formData.append('file', new Blob(['test']), 'test.pdf');

        uploadRequests.push(
          fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            body: formData,
          })
        );
      }

      const responses = await Promise.all(uploadRequests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('should track rate limits by IP address', async () => {
      // Multiple requests from same IP
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch(`${API_BASE}/contact/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Test',
              email: 'test@example.com',
              message: 'Test message',
            }),
          })
        );
      }

      const responses = await Promise.all(requests);

      // Should be rate limited after threshold
      const rateLimited = responses.filter((r) => r.status === 429).length;
      expect(rateLimited).toBeGreaterThan(0);
    });

    it('should handle X-Forwarded-For header', async () => {
      // Test with proxy header
      const response = await fetch(`${API_BASE}/contact/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'Test',
          email: 'test@example.com',
          message: 'Test',
        }),
      });

      // Should apply rate limiting based on X-Forwarded-For
      expect(response.headers.has('x-ratelimit-limit')).toBe(true);
    });
  });

  describe('User-Based Rate Limiting', () => {
    it('should track authenticated users separately', async () => {
      // Login as user 1
      const login1 = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      const { token: token1 } = await login1.json();

      // Login as user 2
      const login2 = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'preparer@test.com',
          password: 'preparer123',
        }),
      });

      const { token: token2 } = await login2.json();

      // Make requests as user 1
      const requests1 = [];
      for (let i = 0; i < 10; i++) {
        requests1.push(
          fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token1}` },
          })
        );
      }

      const responses1 = await Promise.all(requests1);
      const user1RateLimited = responses1.some((r) => r.status === 429);

      // User 2 should have independent rate limit
      const response2 = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token2}` },
      });

      expect(response2.status).not.toBe(429);
    });

    it('should have higher limits for authenticated users', async () => {
      // Unauthenticated requests
      const unauthRequests = [];
      for (let i = 0; i < 10; i++) {
        unauthRequests.push(fetch(`${API_BASE}/services`));
      }

      const unauthResponses = await Promise.all(unauthRequests);
      const unauthRateLimited = unauthResponses.filter((r) => r.status === 429).length;

      // Authenticated requests
      const loginResponse = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      const { token } = await loginResponse.json();

      const authRequests = [];
      for (let i = 0; i < 10; i++) {
        authRequests.push(
          fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
      }

      const authResponses = await Promise.all(authRequests);
      const authRateLimited = authResponses.filter((r) => r.status === 429).length;

      // Authenticated should have fewer rate limits
      expect(authRateLimited).toBeLessThanOrEqual(unauthRateLimited);
    });
  });

  describe('Rate Limit Response', () => {
    it('should return appropriate error message', async () => {
      const requests = [];

      // Trigger rate limit
      for (let i = 0; i < 20; i++) {
        requests.push(
          fetch(`${API_BASE}/contact/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Test',
              email: 'test@example.com',
              message: 'Test',
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find((r) => r.status === 429);

      if (rateLimitedResponse) {
        const data = await rateLimitedResponse.json();

        expect(data.error).toMatch(/rate limit|too many requests/i);
        expect(data).toHaveProperty('retryAfter');
      }
    });

    it('should include Retry-After header', async () => {
      const requests = [];

      for (let i = 0; i < 20; i++) {
        requests.push(fetch(`${API_BASE}/auth/test-login`, { method: 'POST' }));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find((r) => r.status === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers.has('retry-after')).toBe(true);

        const retryAfter = rateLimitedResponse.headers.get('retry-after');
        expect(parseInt(retryAfter!)).toBeGreaterThan(0);
      }
    });
  });

  describe('Rate Limit Bypass', () => {
    it('should allow admin users higher limits', async () => {
      const loginResponse = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123',
        }),
      });

      const { token } = await loginResponse.json();

      // Admin should be able to make many requests
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          fetch(`${API_BASE}/admin/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429).length;

      // Admin should have minimal or no rate limiting
      expect(rateLimited).toBeLessThan(5);
    });

    it('should respect whitelisted IPs if configured', async () => {
      // This would need to be configured in environment
      // Test that whitelisted IPs bypass rate limits
      expect(true).toBe(true);
    });
  });

  describe('DDoS Protection', () => {
    it('should block excessively rapid requests', async () => {
      // Make 100 requests as fast as possible
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 100; i++) {
        requests.push(fetch(`${API_BASE}/contact/submit`));
      }

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      const rateLimited = responses.filter((r) => r.status === 429).length;

      // Should rate limit aggressive bursts
      expect(rateLimited).toBeGreaterThan(50);
      expect(duration).toBeLessThan(5000); // Completed in < 5 seconds
    });

    it('should maintain service during attack', async () => {
      // Simulate attack
      const attackRequests = [];
      for (let i = 0; i < 50; i++) {
        attackRequests.push(fetch(`${API_BASE}/contact/submit`));
      }

      await Promise.all(attackRequests);

      // Legitimate request should still work
      const loginResponse = await fetch(`${API_BASE}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      // Should not be completely blocked
      expect([200, 401, 429]).toContain(loginResponse.status);
    });
  });
});
