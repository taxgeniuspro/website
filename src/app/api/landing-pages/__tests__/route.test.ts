import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { POST, GET } from '../route';
import { auth } from '@/lib/auth';

// Mock db from @/lib/db
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (cols: string) => {
          mockSelect(cols);
          return {
            eq: (col: string, val: any) => {
              mockEq(col, val);
              return {
                limit: (n: number) => {
                  mockLimit(n);
                  return { data: null, error: null };
                },
                order: (col: string, opts: any) => {
                  mockOrder(col, opts);
                  return { data: [], error: null };
                },
              };
            },
            order: (col: string, opts: any) => {
              mockOrder(col, opts);
              return {
                eq: (col: string, val: any) => {
                  mockEq(col, val);
                  return { data: [], error: null };
                },
                then: (cb: any) => cb({ data: [], error: null }),
              };
            },
          };
        },
        insert: (data: any) => {
          mockInsert(data);
          return {
            select: () => ({
              single: () => {
                mockSingle();
                return { data: { id: 'test_id', ...data }, error: null };
              },
            }),
          };
        },
      };
    },
  },
  firstOrNull: (arr: any[] | null) => (arr && arr.length > 0 ? arr[0] : null),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  isAdmin: vi.fn(),
}));

import { isAdmin } from '@/lib/auth';

describe('POST /api/landing-pages - Integration Tests', () => {
  const mockUserId = 'user_123456789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as Mock).mockResolvedValue({ user: null });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test Headline',
          bodyContent: '<p>Test content</p>',
          metaTitle: 'Test Meta Title',
          metaDescription: 'Test meta description',
          qaAccordion: [{ question: 'Test?', answer: 'Yes' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authorization', () => {
    it('should return 403 if user is not admin', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: mockUserId } });
      (isAdmin as Mock).mockResolvedValue(false);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test Headline',
          bodyContent: '<p>Test content</p>',
          metaTitle: 'Test Meta Title',
          metaDescription: 'Test meta description',
          qaAccordion: [{ question: 'Test?', answer: 'Yes' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ user: { id: mockUserId } });
      (isAdmin as Mock).mockResolvedValue(true);
    });

    it('should return 400 if slug is missing', async () => {
      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // slug missing
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [{ question: 'Test?', answer: 'Yes' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveProperty('slug');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          // missing headline, bodyContent, metaTitle, metaDescription, qaAccordion
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 400 if slug has invalid format', async () => {
      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'Atlanta GA', // Invalid - contains spaces and uppercase
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [{ question: 'Test?', answer: 'Yes' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });
});

describe('GET /api/landing-pages - Integration Tests', () => {
  const mockUserId = 'user_123456789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as Mock).mockResolvedValue({ user: null });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authorization', () => {
    it('should return 403 if user is not admin', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: mockUserId } });
      (isAdmin as Mock).mockResolvedValue(false);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('Fetch Landing Pages', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ user: { id: mockUserId } });
      (isAdmin as Mock).mockResolvedValue(true);
    });

    it('should call db.from with landing_pages table', async () => {
      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      await GET(request);

      expect(mockFrom).toHaveBeenCalledWith('landing_pages');
    });
  });
});
