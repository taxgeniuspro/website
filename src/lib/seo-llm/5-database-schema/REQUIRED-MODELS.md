# Required Database Models for Portable SEO + LLM System

## Core Models

1. **City** - 200 US cities data
2. **CityLandingPage** - Generated city-specific pages
3. **Product** - Product catalog
4. **ProductSEOContent** - AI-generated SEO content cache
5. **Translation** - Multi-language translations
6. **N8NWebhook** - Automation triggers

## Optional Models (if using full SEO Brain)

7. **ProductCampaignQueue** - Campaign management
8. **ContentSnapshot** - A/B testing versions
9. **PerformanceMetrics** - Analytics tracking

See `prisma-models/schema.prisma` for complete schema definitions.
