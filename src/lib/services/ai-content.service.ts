import { GoogleGenerativeAI } from '@google/generative-ai';
import DOMPurify from 'isomorphic-dompurify';

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface GeneratedLandingPageContent {
  headline: string;
  bodyContent: string;
  metaTitle: string;
  metaDescription: string;
  qaAccordion: Array<{ question: string; answer: string }>;
}

export interface GenerateContentInput {
  city: string;
  state?: string;
  keywords: string;
}

/**
 * Generate SEO-optimized landing page content using Google Gemini AI
 *
 * @param input - City, state, and keywords for content generation
 * @returns Generated and sanitized landing page content
 */
export async function generateLandingPageContent(
  input: GenerateContentInput
): Promise<GeneratedLandingPageContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Construct structured prompt for consistent JSON output
  const prompt = `You are an expert tax professional and SEO copywriter. Generate SEO-optimized landing page content for a tax preparation service.

Location: ${input.city}${input.state ? `, ${input.state}` : ''}
Keywords: ${input.keywords}

Generate a JSON object with the following structure (respond ONLY with valid JSON, no markdown):

{
  "headline": "A compelling H1 headline mentioning the city (max 60 chars)",
  "bodyContent": "2-3 paragraphs of HTML content describing tax services in this city. Include <strong> tags for emphasis and <p> tags for paragraphs. Mention local expertise and tax benefits. (300-500 words)",
  "metaTitle": "SEO title tag including city name and 'Tax Preparation' (max 60 chars)",
  "metaDescription": "Meta description for search engines (max 160 chars)",
  "qaAccordion": [
    {
      "question": "What tax services do you offer in [city]?",
      "answer": "We offer comprehensive tax preparation services..."
    },
    {
      "question": "How much does tax preparation cost in [city]?",
      "answer": "Our pricing is competitive and transparent..."
    },
    {
      "question": "Do you offer year-round tax planning in [city]?",
      "answer": "Yes, we provide year-round tax planning and consultation..."
    },
    {
      "question": "Can you help with IRS audits in [city]?",
      "answer": "Yes, our experienced team can represent you..."
    },
    {
      "question": "How do I get started with tax prep in [city]?",
      "answer": "Getting started is easy! Simply create a free account..."
    }
  ]
}

Make it professional, trustworthy, and locally relevant to ${input.city}.`;

  try {
    // Generate content with 10-second timeout
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout after 10 seconds')), 10000)
      ),
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Parse AI response
    const generated = JSON.parse(jsonText) as GeneratedLandingPageContent;

    // MANDATORY: Sanitize AI-generated content before returning (AC19)
    const sanitized = sanitizeAIContent(generated);

    return sanitized;
  } catch (error) {
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('AI content generation timed out. Please try again.');
      }
      if (error.message.includes('JSON')) {
        throw new Error('AI returned invalid format. Please try again.');
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error('Unknown error during AI content generation');
  }
}

/**
 * Sanitize AI-generated content using DOMPurify to prevent XSS attacks
 * This is MANDATORY (AC19) - never skip sanitization of AI-generated content
 *
 * @param content - Raw AI-generated content
 * @returns Sanitized content safe for database storage and rendering
 */
export function sanitizeAIContent(
  content: GeneratedLandingPageContent
): GeneratedLandingPageContent {
  return {
    headline: DOMPurify.sanitize(content.headline),
    bodyContent: DOMPurify.sanitize(content.bodyContent, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'h2', 'h3'],
      ALLOWED_ATTR: [],
    }),
    metaTitle: DOMPurify.sanitize(content.metaTitle),
    metaDescription: DOMPurify.sanitize(content.metaDescription),
    qaAccordion: content.qaAccordion.map((qa) => ({
      question: DOMPurify.sanitize(qa.question),
      answer: DOMPurify.sanitize(qa.answer, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
      }),
    })),
  };
}

/**
 * Generate a URL-safe slug from a city name
 *
 * @param city - City name (e.g., "New York City")
 * @returns URL-safe slug (e.g., "new-york-city")
 */
export function generateSlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
}
