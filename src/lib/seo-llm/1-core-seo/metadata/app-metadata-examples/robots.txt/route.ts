import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html

# ===========================
# SEARCH ENGINES (CRITICAL)
# ===========================

# Google Search
User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/

# Bing / Microsoft
User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/

# Apple (Siri, Spotlight, Safari)
User-agent: Applebot
Allow: /
Disallow: /admin/
Disallow: /api/

# DuckDuckGo
User-agent: DuckAssistBot
Allow: /
Disallow: /admin/
Disallow: /api/

# ===========================
# AI SEARCH CRAWLERS (ALLOW)
# ===========================

# OpenAI ChatGPT Search
User-agent: ChatGPT-User
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /admin/
Disallow: /api/

# Anthropic Claude
User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Claude-SearchBot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Claude-User
Allow: /
Disallow: /admin/
Disallow: /api/

# Perplexity AI
User-agent: PerplexityBot
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Perplexity-User
Allow: /
Disallow: /admin/
Disallow: /api/

# Meta AI
User-agent: Meta-ExternalAgent
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: Meta-ExternalFetcher
Allow: /
Disallow: /admin/
Disallow: /api/

# Google AI
User-agent: Google-CloudVertexBot
Allow: /
Disallow: /admin/
Disallow: /api/

# Mistral AI
User-agent: MistralAI-User
Allow: /
Disallow: /admin/
Disallow: /api/

# ===========================
# ARCHIVAL & RESEARCH (ALLOW)
# ===========================

# Internet Archive
User-agent: archive.org_bot
Allow: /
Disallow: /admin/
Disallow: /api/

# Common Crawl (research)
User-agent: CCBot
Allow: /
Disallow: /admin/
Disallow: /api/

# ===========================
# BLOCKED CRAWLERS
# ===========================

# ByteDance/TikTok (aggressive, low SEO value)
User-agent: Bytespider
Disallow: /

# OpenAI training-only (not search)
User-agent: GPTBot
Disallow: /

# ===========================
# DEFAULT RULES
# ===========================

# All other bots
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Crawl-delay: 10

# ===========================
# SITEMAPS
# ===========================

Sitemap: https://gangrunprinting.com/sitemap.xml
Sitemap: https://gangrunprinting.com/sitemap-0.xml
`

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
