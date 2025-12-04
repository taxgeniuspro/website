import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { POST, GET } from '../route';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    landingPage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

describe('POST /api/landing-pages - Integration Tests', () => {
  const mockUserId = 'user_123456789';
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as Mock).mockResolvedValue({ userId: null });

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
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);
      mockPrisma.landingPage.create.mockResolvedValue({
        id: 'test_id_123',
        slug: 'atlanta',
        city: 'Atlanta',
        isPublished: false,
        createdAt: new Date(),
      });
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
          qaAccordion: [],
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

    it('should return 400 if slug exceeds 100 characters', async () => {
      const longSlug = 'a'.repeat(101);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: longSlug,
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 if metaTitle exceeds 60 characters', async () => {
      const longMetaTitle = 'A'.repeat(61);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: longMetaTitle,
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 if metaDescription exceeds 160 characters', async () => {
      const longMetaDesc = 'A'.repeat(161);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: longMetaDesc,
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should accept valid input with all required fields', async () => {
      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          state: 'GA',
          headline: 'Atlanta Tax Preparation Services',
          bodyContent: '<p>Professional tax services</p>',
          metaTitle: 'Atlanta Tax Prep | Tax Genius',
          metaDescription: 'Expert tax preparation services in Atlanta',
          qaAccordion: [{ question: 'What are your hours?', answer: '<p>9am-6pm</p>' }],
          generatedBy: mockUserId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Duplicate Slug Check (AC14)', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
    });

    it('should return 409 if slug already exists', async () => {
      // Mock existing landing page
      mockPrisma.landingPage.findUnique.mockResolvedValue({
        id: 'existing_id',
        slug: 'atlanta',
        city: 'Atlanta',
      });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Duplicate slug');
      expect(data.message).toContain('atlanta');
    });

    it('should allow creation if slug does not exist', async () => {
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);
      mockPrisma.landingPage.create.mockResolvedValue({
        id: 'test_id',
        slug: 'atlanta',
        city: 'Atlanta',
        isPublished: false,
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.landingPage.create).toHaveBeenCalled();
    });
  });

  describe('Landing Page Creation (AC15)', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);
    });

    it('should create landing page with draft status by default', async () => {
      const mockCreatedPage = {
        id: 'test_id_123',
        slug: 'atlanta',
        city: 'Atlanta',
        state: 'GA',
        headline: 'Test Headline',
        isPublished: false,
        version: 1,
        createdAt: new Date(),
      };

      mockPrisma.landingPage.create.mockResolvedValue(mockCreatedPage);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          state: 'GA',
          headline: 'Test Headline',
          bodyContent: '<p>Test content</p>',
          metaTitle: 'Test Meta Title',
          metaDescription: 'Test meta description',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isPublished).toBe(false);
      expect(data.message).toContain('Draft');

      // Verify Prisma create was called with isPublished: false
      expect(mockPrisma.landingPage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: false,
            version: 1,
          }),
        })
      );
    });

    it('should set generatedBy to userId if not provided', async () => {
      mockPrisma.landingPage.create.mockResolvedValue({
        id: 'test_id',
        slug: 'atlanta',
        generatedBy: mockUserId,
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
          // generatedBy not provided
        }),
      });

      await POST(request);

      expect(mockPrisma.landingPage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            generatedBy: mockUserId,
          }),
        })
      );
    });

    it('should return created landing page metadata', async () => {
      const mockCreatedPage = {
        id: 'test_id_123',
        slug: 'atlanta',
        city: 'Atlanta',
        isPublished: false,
        createdAt: new Date('2025-01-15T10:30:00Z'),
      };

      mockPrisma.landingPage.create.mockResolvedValue(mockCreatedPage);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data).toMatchObject({
        id: 'test_id_123',
        slug: 'atlanta',
        city: 'Atlanta',
        isPublished: false,
      });
      expect(data.data).toHaveProperty('createdAt');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
      mockPrisma.landingPage.findUnique.mockResolvedValue(null);
    });

    it('should return 500 on database error', async () => {
      mockPrisma.landingPage.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'atlanta',
          city: 'Atlanta',
          headline: 'Test',
          bodyContent: '<p>Test</p>',
          metaTitle: 'Test',
          metaDescription: 'Test',
          qaAccordion: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });
});

describe('GET /api/landing-pages - Integration Tests', () => {
  const mockUserId = 'user_123456789';
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });
  });

  describe('Fetch Landing Pages', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
    });

    it('should return all landing pages ordered by createdAt desc', async () => {
      const mockPages = [
        {
          id: 'id_2',
          slug: 'boston',
          city: 'Boston',
          state: 'MA',
          headline: 'Boston Tax Services',
          metaTitle: 'Boston Tax',
          isPublished: true,
          createdAt: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-15'),
        },
        {
          id: 'id_1',
          slug: 'atlanta',
          city: 'Atlanta',
          state: 'GA',
          headline: 'Atlanta Tax Services',
          metaTitle: 'Atlanta Tax',
          isPublished: false,
          createdAt: new Date('2025-01-14'),
          updatedAt: new Date('2025-01-14'),
        },
      ];

      mockPrisma.landingPage.findMany.mockResolvedValue(mockPages);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(mockPrisma.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should return empty array if no landing pages exist', async () => {
      mockPrisma.landingPage.findMany.mockResolvedValue([]);

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should return 500 on database error', async () => {
      mockPrisma.landingPage.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3005/api/landing-pages', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });
});
