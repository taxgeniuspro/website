import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeAIContent, generateSlug } from '../ai-content.service';
import type { GeneratedLandingPageContent } from '../ai-content.service';

describe('AI Content Service - Unit Tests', () => {
  describe('generateSlug', () => {
    it('should convert city name to lowercase kebab-case slug', () => {
      expect(generateSlug('Atlanta')).toBe('atlanta');
      expect(generateSlug('New York')).toBe('new-york');
      expect(generateSlug('San Francisco')).toBe('san-francisco');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Salt  Lake   City')).toBe('salt-lake-city');
    });

    it('should handle special characters', () => {
      expect(generateSlug("St. Paul's")).toBe('st-pauls');
      expect(generateSlug('Miami-Dade')).toBe('miami-dade');
    });

    it('should trim whitespace', () => {
      expect(generateSlug('  Boston  ')).toBe('boston');
    });

    it('should handle multiple consecutive hyphens', () => {
      expect(generateSlug('New---York')).toBe('new-york');
    });
  });

  describe('sanitizeAIContent - XSS Protection (MANDATORY AC19)', () => {
    it('should sanitize script tags from headline', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services <script>alert("xss")</script> in Atlanta',
        bodyContent: '<p>Body content</p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.headline).not.toContain('<script>');
      expect(sanitized.headline).not.toContain('alert');
      expect(sanitized.headline).toBe('Tax Services  in Atlanta');
    });

    it('should sanitize script tags from bodyContent', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Safe Headline',
        bodyContent: '<p>Content</p><script>fetch("evil.com")</script><p>More content</p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.bodyContent).not.toContain('<script>');
      expect(sanitized.bodyContent).not.toContain('fetch');
      expect(sanitized.bodyContent).toContain('<p>Content</p>');
      expect(sanitized.bodyContent).toContain('<p>More content</p>');
    });

    it('should sanitize onclick event handlers', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p onclick="alert(\'xss\')">Click me</p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.bodyContent).not.toContain('onclick');
      expect(sanitized.bodyContent).not.toContain('alert');
      expect(sanitized.bodyContent).toContain('<p>Click me</p>');
    });

    it('should sanitize javascript: URLs', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p><a href="javascript:alert(\'xss\')">Click</a></p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.bodyContent).not.toContain('javascript:');
      expect(sanitized.bodyContent).not.toContain('alert');
      // Note: DOMPurify may remove the entire anchor tag or just the href
    });

    it('should sanitize iframe tags', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p>Content</p><iframe src="evil.com"></iframe>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.bodyContent).not.toContain('<iframe');
      expect(sanitized.bodyContent).toContain('<p>Content</p>');
    });

    it('should sanitize img onerror attributes', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<img src="x" onerror="alert(\'xss\')">',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      // img tags are not in ALLOWED_TAGS, so entire tag should be removed
      expect(sanitized.bodyContent).not.toContain('<img');
      expect(sanitized.bodyContent).not.toContain('onerror');
    });

    it('should allow safe HTML tags in bodyContent', () => {
      const safeContent: GeneratedLandingPageContent = {
        headline: 'Atlanta Tax Preparation Services',
        bodyContent:
          '<p>Welcome to <strong>Tax Genius</strong> in Atlanta.</p><ul><li>Tax Filing</li><li>IRS Audit</li></ul><h2>Our Services</h2>',
        metaTitle: 'Atlanta Tax Prep | Tax Genius',
        metaDescription: 'Professional tax services in Atlanta',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(safeContent);

      expect(sanitized.bodyContent).toContain('<p>');
      expect(sanitized.bodyContent).toContain('<strong>');
      expect(sanitized.bodyContent).toContain('<ul>');
      expect(sanitized.bodyContent).toContain('<li>');
      expect(sanitized.bodyContent).toContain('<h2>');
    });

    it('should remove disallowed HTML tags', () => {
      const unsafeContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p>Content</p><div>Should be removed</div><span>Also removed</span>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(unsafeContent);

      expect(sanitized.bodyContent).toContain('<p>Content</p>');
      expect(sanitized.bodyContent).not.toContain('<div>');
      expect(sanitized.bodyContent).not.toContain('<span>');
      // Text content should remain
      expect(sanitized.bodyContent).toContain('Should be removed');
      expect(sanitized.bodyContent).toContain('Also removed');
    });

    it('should sanitize Q&A accordion questions and answers', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p>Body</p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [
          {
            question: 'What is tax prep? <script>alert("xss")</script>',
            answer: '<p>Answer text</p><script>fetch("evil.com")</script>',
          },
          {
            question: 'Safe question',
            answer: '<p onclick="alert(\'xss\')">Safe answer</p>',
          },
        ],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      expect(sanitized.qaAccordion[0].question).not.toContain('<script>');
      expect(sanitized.qaAccordion[0].question).toContain('What is tax prep?');
      expect(sanitized.qaAccordion[0].answer).not.toContain('<script>');
      expect(sanitized.qaAccordion[0].answer).not.toContain('fetch');
      expect(sanitized.qaAccordion[1].answer).not.toContain('onclick');
    });

    it('should sanitize metaTitle and metaDescription', () => {
      const maliciousContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p>Body</p>',
        metaTitle: 'Title <script>alert("xss")</script>',
        metaDescription: 'Description <img src=x onerror="alert(\'xss\')">',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(maliciousContent);

      // Script tags should be completely removed
      expect(sanitized.metaTitle).not.toContain('<script>');
      expect(sanitized.metaTitle).toBe('Title ');

      // DOMPurify with default settings keeps img tags but strips onerror attribute
      // This is acceptable for meta tags since they render as plain text in HTML head
      expect(sanitized.metaDescription).not.toContain('onerror');
      expect(sanitized.metaDescription).toContain('Description');
    });

    it('should handle empty content safely', () => {
      const emptyContent: GeneratedLandingPageContent = {
        headline: '',
        bodyContent: '',
        metaTitle: '',
        metaDescription: '',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(emptyContent);

      expect(sanitized.headline).toBe('');
      expect(sanitized.bodyContent).toBe('');
      expect(sanitized.metaTitle).toBe('');
      expect(sanitized.metaDescription).toBe('');
      expect(sanitized.qaAccordion).toEqual([]);
    });

    it('should handle null/undefined in qaAccordion gracefully', () => {
      const content: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent: '<p>Body</p>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [
          { question: 'Q1', answer: 'A1' },
          { question: '', answer: '' },
        ],
      };

      const sanitized = sanitizeAIContent(content);

      expect(sanitized.qaAccordion).toHaveLength(2);
      expect(sanitized.qaAccordion[1].question).toBe('');
      expect(sanitized.qaAccordion[1].answer).toBe('');
    });

    it('should preserve legitimate formatting in bodyContent', () => {
      const formattedContent: GeneratedLandingPageContent = {
        headline: 'Tax Services',
        bodyContent:
          '<p>Tax Genius provides <strong>expert</strong> <em>tax preparation</em> services.</p><ul><li>Individual taxes</li><li>Business taxes</li></ul><h2>Why Choose Us?</h2><ol><li>Experienced</li><li>Affordable</li></ol>',
        metaTitle: 'Meta Title',
        metaDescription: 'Meta Description',
        qaAccordion: [],
      };

      const sanitized = sanitizeAIContent(formattedContent);

      expect(sanitized.bodyContent).toContain('<strong>expert</strong>');
      expect(sanitized.bodyContent).toContain('<em>tax preparation</em>');
      expect(sanitized.bodyContent).toContain('<ul>');
      expect(sanitized.bodyContent).toContain('<ol>');
      expect(sanitized.bodyContent).toContain('<h2>');
    });
  });

  describe('Content Integrity', () => {
    it('should not modify safe content', () => {
      const safeContent: GeneratedLandingPageContent = {
        headline: 'Atlanta Tax Preparation Services - Expert Tax Filing',
        bodyContent:
          '<p>Welcome to Tax Genius Atlanta. We offer professional tax preparation services for individuals and businesses.</p><h2>Our Services</h2><ul><li>Individual Tax Filing</li><li>Business Tax Returns</li><li>IRS Audit Support</li></ul>',
        metaTitle: 'Atlanta Tax Prep | Expert Tax Services | Tax Genius',
        metaDescription:
          'Professional tax preparation services in Atlanta. Expert tax filing, IRS audit support, and business tax returns. Book your appointment today.',
        qaAccordion: [
          {
            question: 'What are your hours?',
            answer: '<p>We are open Monday-Friday 9am-6pm.</p>',
          },
          {
            question: 'Do you offer virtual appointments?',
            answer:
              '<p>Yes, we offer <strong>secure virtual appointments</strong> via video call.</p>',
          },
        ],
      };

      const sanitized = sanitizeAIContent(safeContent);

      expect(sanitized.headline).toBe(safeContent.headline);
      expect(sanitized.metaTitle).toBe(safeContent.metaTitle);
      expect(sanitized.metaDescription).toBe(safeContent.metaDescription);
      expect(sanitized.bodyContent).toContain('Welcome to Tax Genius Atlanta');
      expect(sanitized.qaAccordion[0].question).toBe(safeContent.qaAccordion[0].question);
    });
  });
});
