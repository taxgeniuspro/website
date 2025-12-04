import { MetadataRoute } from 'next';

/**
 * Robots.txt configuration (AC21)
 * Allows crawling of /locations/* paths
 * Includes explicit support for AI/LLM crawlers (GPTBot, ClaudeBot, etc.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Standard crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
      // AI/LLM Crawlers - Explicitly allow recruitment pages for ChatGPT, Claude, Perplexity, etc.
      {
        userAgent: ['GPTBot', 'ChatGPT-User'],
        allow: ['/', '/en/careers/', '/es/careers/', '/en/preparer/', '/es/preparer/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
      {
        userAgent: ['ClaudeBot', 'anthropic-ai'],
        allow: ['/', '/en/careers/', '/es/careers/', '/en/preparer/', '/es/preparer/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
      {
        userAgent: ['GoogleOther', 'Google-Extended'],
        allow: ['/', '/en/careers/', '/es/careers/', '/en/preparer/', '/es/preparer/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/en/careers/', '/es/careers/', '/en/preparer/', '/es/preparer/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
      {
        userAgent: ['CCBot', 'cohere-ai'],
        allow: ['/', '/en/careers/', '/es/careers/', '/en/preparer/', '/es/preparer/'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/app/'],
      },
    ],
    sitemap: 'https://taxgeniuspro.tax/sitemap.xml',
  };
}
