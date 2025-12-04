import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { POST } from '../route';
import { auth } from '@/lib/auth';
import { generateLandingPageContent } from '@/lib/services/ai-content.service';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock AI service
vi.mock('@/lib/services/ai-content.service', () => ({
  generateLandingPageContent: vi.fn(),
  generateSlug: (city: string) => city.toLowerCase().replace(/\s+/g, '-'),
}));

describe('POST /api/ai-content/generate - Integration Tests', () => {
  const mockUserId = 'user_123456789';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock GEMINI_API_KEY environment variable
    process.env.GEMINI_API_KEY = 'test_gemini_api_key_123';
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      (auth as Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep, tax filing',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should proceed when user is authenticated', async () => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
      (generateLandingPageContent as Mock).mockResolvedValue({
        headline: 'Test Headline',
        bodyContent: '<p>Test content</p>',
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test meta description',
        qaAccordion: [],
      });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
    });

    it('should return 400 if city is missing', async () => {
      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: 'tax prep',
          // city missing
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveProperty('city');
    });

    it('should return 400 if keywords are missing', async () => {
      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          // keywords missing
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveProperty('keywords');
    });

    it('should return 400 if city exceeds 100 characters', async () => {
      const longCity = 'A'.repeat(101);

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: longCity,
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveProperty('city');
    });

    it('should return 400 if keywords exceed 500 characters', async () => {
      const longKeywords = 'tax prep, '.repeat(60); // > 500 chars

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: longKeywords,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toHaveProperty('keywords');
    });

    it('should accept valid input with all fields', async () => {
      (generateLandingPageContent as Mock).mockResolvedValue({
        headline: 'Test Headline',
        bodyContent: '<p>Test content</p>',
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test meta description',
        qaAccordion: [],
      });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          state: 'GA',
          keywords: 'tax prep, tax filing, IRS audit',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should accept valid input with optional state omitted', async () => {
      (generateLandingPageContent as Mock).mockResolvedValue({
        headline: 'Test Headline',
        bodyContent: '<p>Test content</p>',
        metaTitle: 'Test Meta Title',
        metaDescription: 'Test meta description',
        qaAccordion: [],
      });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Content Generation', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
    });

    it('should return generated content with correct structure', async () => {
      const mockContent = {
        headline: 'Atlanta Tax Preparation Services',
        bodyContent: '<p>Professional tax services in Atlanta</p>',
        metaTitle: 'Atlanta Tax Prep | Tax Genius',
        metaDescription: 'Expert tax preparation services in Atlanta, GA',
        qaAccordion: [{ question: 'What are your hours?', answer: '<p>Monday-Friday 9am-6pm</p>' }],
      };

      (generateLandingPageContent as Mock).mockResolvedValue(mockContent);

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          state: 'GA',
          keywords: 'tax prep, tax filing',
        }),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        headline: mockContent.headline,
        bodyContent: mockContent.bodyContent,
        metaTitle: mockContent.metaTitle,
        metaDescription: mockContent.metaDescription,
        qaAccordion: mockContent.qaAccordion,
        slug: 'atlanta',
        city: 'Atlanta',
        state: 'GA',
        generatedBy: mockUserId,
      });
      expect(result.data).toHaveProperty('generatedAt');
    });

    it('should generate slug from city name', async () => {
      (generateLandingPageContent as Mock).mockResolvedValue({
        headline: 'Test',
        bodyContent: '<p>Test</p>',
        metaTitle: 'Test',
        metaDescription: 'Test',
        qaAccordion: [],
      });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'New York City',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.data.slug).toBe('new-york-city');
    });

    it('should include generatedBy with userId', async () => {
      (generateLandingPageContent as Mock).mockResolvedValue({
        headline: 'Test',
        bodyContent: '<p>Test</p>',
        metaTitle: 'Test',
        metaDescription: 'Test',
        qaAccordion: [],
      });

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(result.data.generatedBy).toBe(mockUserId);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (auth as Mock).mockResolvedValue({ userId: mockUserId });
    });

    it('should return 504 on AI generation timeout', async () => {
      (generateLandingPageContent as Mock).mockRejectedValue(
        new Error('AI generation timeout after 10 seconds')
      );

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toBe('AI generation timed out');
      expect(data.message).toContain('took too long');
      expect(data.retryable).toBe(true);
    });

    it('should return 500 on rate limit error', async () => {
      (generateLandingPageContent as Mock).mockRejectedValue(new Error('RATE_LIMIT_EXCEEDED'));

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // No special handling for rate limits yet, returns generic 500
      expect(response.status).toBe(500);
      expect(data.error).toBe('Content generation failed');
      expect(data.retryable).toBe(true);
    });

    it('should return 500 on missing API key', async () => {
      // Temporarily remove API key
      delete process.env.GEMINI_API_KEY;

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI service not configured - Missing GEMINI_API_KEY');

      // Restore API key for other tests
      process.env.GEMINI_API_KEY = 'test_gemini_api_key_123';
    });

    it('should return 500 on generic AI generation error', async () => {
      (generateLandingPageContent as Mock).mockRejectedValue(new Error('Unknown AI error'));

      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Atlanta',
          keywords: 'tax prep',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Content generation failed');
      expect(data.message).toBe('Unknown AI error');
      expect(data.retryable).toBe(true);
    });

    it('should return 500 on malformed JSON (caught by try-catch)', async () => {
      const request = new Request('http://localhost:3005/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(request);

      // JSON parsing happens inside try-catch, so returns 500 instead of throwing
      expect(response.status).toBe(500);
    });
  });
});
