import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gangrunprinting.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/_next/*',
          '/cart',
          '/checkout/*',
          '/account/*',
          '/orders/*',
          '/*.json$',
          '/*.xml$',
        ],
      },
      {
        userAgent: 'GPTBot', // OpenAI ChatGPT crawler
        allow: '/',
        disallow: ['/admin/*', '/api/*', '/cart', '/checkout/*', '/account/*', '/orders/*'],
      },
      {
        userAgent: 'ChatGPT-User', // ChatGPT user agent
        allow: '/',
        disallow: ['/admin/*', '/api/*', '/cart', '/checkout/*', '/account/*', '/orders/*'],
      },
      {
        userAgent: 'anthropic-ai', // Claude crawler
        allow: '/',
        disallow: ['/admin/*', '/api/*', '/cart', '/checkout/*', '/account/*', '/orders/*'],
      },
      {
        userAgent: 'Google-Extended', // Google Bard/Gemini
        allow: '/',
        disallow: ['/admin/*', '/api/*', '/cart', '/checkout/*', '/account/*', '/orders/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
