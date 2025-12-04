# SEO Verification Setup Guide

## Environment Variables for Search Engine Verification

Add these environment variables to your `.env.local` file to enable search engine verification tags:

```bash
# Google Search Console Verification
# Get this from: https://search.google.com/search-console
# Settings > Ownership verification > HTML tag method
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-google-verification-code-here

# Bing Webmaster Tools Verification
# Get this from: https://www.bing.com/webmasters
# Settings > Verify ownership > Meta tag option
NEXT_PUBLIC_BING_SITE_VERIFICATION=your-bing-verification-code-here

# Facebook Domain Verification
# Get this from: https://business.facebook.com/settings/owned-domains
# Add domain > Meta tag verification
NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=your-facebook-verification-code-here
```

## How to Get Verification Codes

### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add Property"
3. Select "URL prefix" and enter: `https://taxgeniuspro.tax`
4. Choose "HTML tag" verification method
5. Copy the content value from the meta tag
6. Example: `<meta name="google-site-verification" content="ABC123..." />`
7. Use `ABC123...` as the value for `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Click "Add a site"
3. Enter: `https://taxgeniuspro.tax`
4. Choose "Meta tag" verification option
5. Copy the content value
6. Example: `<meta name="msvalidate.01" content="XYZ789..." />`
7. Use `XYZ789...` as the value for `NEXT_PUBLIC_BING_SITE_VERIFICATION`

### Facebook Domain Verification

1. Go to [Facebook Business Settings](https://business.facebook.com/settings/owned-domains)
2. Click "Add"
3. Enter your domain
4. Choose "Meta tag" verification
5. Copy the content value
6. Use that value for `NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION`

## After Adding Environment Variables

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Verify the tags are in the HTML:**
   - Open your site in a browser
   - View page source
   - Search for `google-site-verification`, `msvalidate`, and `facebook-domain-verification`
   - The meta tags should be present in the `<head>` section

3. **Complete verification in each platform:**
   - Google Search Console: Click "Verify" button
   - Bing Webmaster: Click "Verify" button
   - Facebook: Click "Verify" button

4. **Submit your sitemap:**
   - Google: Add `https://taxgeniuspro.tax/sitemap.xml`
   - Bing: Add `https://taxgeniuspro.tax/sitemap.xml`

## Verification Status

Once verified, you'll have access to:

### Google Search Console
- Search performance data
- Index coverage reports
- Mobile usability issues
- Core Web Vitals
- Rich results monitoring

### Bing Webmaster Tools
- Search traffic data
- Crawl errors
- SEO analyzer
- Keyword research

### Facebook Domain Verification
- Link previews work properly
- Attribution tracking
- Instagram link in bio

## Troubleshooting

**Meta tags not appearing:**
1. Check that environment variables are set correctly
2. Restart your development server
3. Clear browser cache
4. Verify the variable names match exactly

**Verification fails:**
1. Wait 24-48 hours after adding tags
2. Ensure the site is publicly accessible (not behind auth)
3. Check that there are no robots.txt blocks
4. Verify HTTPS is working correctly

**Need help?**
- Check the [Next.js Metadata documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- Review verification in `/src/app/layout.tsx` (lines 56-62)
