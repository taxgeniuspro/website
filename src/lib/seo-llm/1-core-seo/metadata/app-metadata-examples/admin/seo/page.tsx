'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, ExternalLink, CheckCircle2, BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import toast from '@/lib/toast'

export default function SEOPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [productCount, setProductCount] = useState<number>(0)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    fetchProductCount()
  }, [])

  async function fetchProductCount() {
    try {
      const response = await fetch('/api/products?isActive=true')
      if (response.ok) {
        const products = await response.json()
        setProductCount(products.length)
      }
    } catch (error) {
      console.error('Failed to fetch product count:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const sitemapUrl = 'https://gangrunprinting.com/sitemap.xml'
  const robotsUrl = 'https://gangrunprinting.com/robots.txt'
  const chatgptFeedUrl = 'https://gangrunprinting.com/feeds/chatgpt-products.json'

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const searchEngineLinks = [
    {
      name: 'Google Search Console',
      url: 'https://search.google.com/search-console',
      submitUrl: 'https://search.google.com/search-console/sitemaps',
      description: 'Submit sitemap and monitor Google search performance',
      color: 'bg-blue-500',
    },
    {
      name: 'Bing Webmaster Tools',
      url: 'https://www.bing.com/webmasters',
      submitUrl: 'https://www.bing.com/webmasters/sitemaps',
      description: 'Submit sitemap to Bing and Yahoo search',
      color: 'bg-orange-500',
    },
    {
      name: 'Yandex Webmaster',
      url: 'https://webmaster.yandex.com',
      submitUrl: 'https://webmaster.yandex.com/sites/add/',
      description: 'Submit to Yandex (Russian search engine)',
      color: 'bg-red-500',
    },
    {
      name: 'Baidu Webmaster',
      url: 'https://ziyuan.baidu.com',
      submitUrl: 'https://ziyuan.baidu.com/site/index',
      description: 'Submit to Baidu (Chinese search engine)',
      color: 'bg-blue-600',
    },
  ]

  const seoTools = [
    {
      name: 'Google PageSpeed Insights',
      url: `https://pagespeed.web.dev/analysis?url=https://gangrunprinting.com`,
      description: 'Check page speed and performance',
    },
    {
      name: 'Google Rich Results Test',
      url: `https://search.google.com/test/rich-results?url=https://gangrunprinting.com`,
      description: 'Test structured data and rich snippets',
    },
    {
      name: 'Schema Markup Validator',
      url: `https://validator.schema.org/#url=https://gangrunprinting.com`,
      description: 'Validate schema.org markup',
    },
    {
      name: 'Mobile-Friendly Test',
      url: `https://search.google.com/test/mobile-friendly?url=https://gangrunprinting.com`,
      description: 'Check mobile compatibility',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SEO & Search Engine Submission</h1>
        <p className="text-gray-600 mt-2">
          Manage sitemaps and submit your website to search engines
        </p>
      </div>

      {/* SEO Performance Dashboard - NEW */}
      <Card className="mb-6 border-2 border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            SEO Performance Dashboard
            <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded">NEW</span>
          </CardTitle>
          <CardDescription>
            Monitor Google rankings, traffic changes, and receive automated SEO alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="font-medium">Real-time SEO Monitoring & Alerts</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>✅ Daily Google Search Console ranking checks</p>
              <p>✅ Automated email & Slack alerts for ranking drops</p>
              <p>✅ Product-level keyword tracking</p>
              <p>✅ Traffic and CTR monitoring</p>
              <p>✅ Actionable suggestions for improvement</p>
            </div>
          </div>

          <Button asChild className="w-full" size="lg" variant="default">
            <Link href="/admin/seo/performance">
              <BarChart3 className="h-4 w-4 mr-2" />
              View SEO Performance Dashboard
            </Link>
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Monitoring:</strong> Daily at 2:00 AM (America/Chicago)
            </p>
            <p>
              <strong>Alerts:</strong> Email + Slack for critical issues
            </p>
            <p>
              <strong>Data Source:</strong> Google Search Console API
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ChatGPT Shopping Feed - PRIORITY */}
      <Card className="mb-6 border-2 border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 ChatGPT Shopping Feed
            <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded">
              READY TO SUBMIT
            </span>
          </CardTitle>
          <CardDescription>
            OpenAI Agentic Commerce Protocol - Make products discoverable in ChatGPT
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Product Feed URL</Label>
            <div className="flex gap-2 mt-2">
              <Input readOnly className="font-mono text-sm" value={chatgptFeedUrl} />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(chatgptFeedUrl, 'ChatGPT Feed URL')}
              >
                {copied === 'ChatGPT Feed URL' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button asChild size="icon" variant="outline">
                <a href={chatgptFeedUrl} rel="noopener noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">
                Feed Status: {loadingProducts ? 'Loading...' : `Active (${productCount} products)`}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>✅ JSON format compatible with OpenAI spec</p>
              <p>✅ Auto-generated with product images and descriptions</p>
              <p>✅ Updates every 15 minutes via cron job</p>
              <p>✅ Includes all active products (filters out test products)</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📝 Submission Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Click the button below to open ChatGPT Merchants portal</li>
              <li>Sign in with your OpenAI account</li>
              <li>Click "Add New Feed" or "Submit Product Feed"</li>
              <li>
                Paste feed URL: <code className="bg-white px-1 rounded">{chatgptFeedUrl}</code>
              </li>
              <li>
                Select feed format: <strong>JSON</strong>
              </li>
              <li>
                Set update frequency: <strong>Every 15 minutes</strong>
              </li>
              <li>Click "Submit" and wait for validation</li>
            </ol>
          </div>

          <Button asChild className="w-full" size="lg">
            <a href="https://chatgpt.com/merchants" rel="noopener noreferrer" target="_blank">
              🚀 Submit to ChatGPT Merchants Portal
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Feed Generator Script:</strong>{' '}
              <code>/root/websites/gangrunprinting/scripts/generate-chatgpt-product-feed.ts</code>
            </p>
            <p>
              <strong>Cron Schedule:</strong> <code>*/15 * * * *</code> (every 15 minutes)
            </p>
            <p>
              <strong>Feed Format:</strong> OpenAI ChatGPT Shopping / Agentic Commerce Protocol
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sitemap & Robots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📄 Sitemap.xml</CardTitle>
            <CardDescription>Your website sitemap for search engines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sitemap URL</Label>
              <div className="flex gap-2 mt-2">
                <Input readOnly value={sitemapUrl} />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(sitemapUrl, 'Sitemap URL')}
                >
                  {copied === 'Sitemap URL' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button asChild size="icon" variant="outline">
                  <a href={sitemapUrl} rel="noopener noreferrer" target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ✅ Auto-generated with all products, categories, and pages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🤖 Robots.txt</CardTitle>
            <CardDescription>Search engine crawling instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Robots.txt URL</Label>
              <div className="flex gap-2 mt-2">
                <Input readOnly value={robotsUrl} />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(robotsUrl, 'Robots URL')}
                >
                  {copied === 'Robots URL' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button asChild size="icon" variant="outline">
                  <a href={robotsUrl} rel="noopener noreferrer" target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ✅ Configured to allow crawling and block admin pages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Engine Submission */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit to Search Engines</CardTitle>
          <CardDescription>
            Submit your sitemap to major search engines to get indexed faster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchEngineLinks.map((engine) => (
              <Card key={engine.name} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${engine.color} mt-2`} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{engine.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{engine.description}</p>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={engine.url} rel="noopener noreferrer" target="_blank">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Dashboard
                          </a>
                        </Button>
                        <Button asChild size="sm">
                          <a href={engine.submitUrl} rel="noopener noreferrer" target="_blank">
                            Submit Sitemap
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEO Tools */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Testing Tools</CardTitle>
          <CardDescription>Test and validate your website's SEO performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {seoTools.map((tool) => (
              <Button
                key={tool.name}
                asChild
                className="justify-start h-auto py-3"
                variant="outline"
              >
                <a href={tool.url} rel="noopener noreferrer" target="_blank">
                  <div className="text-left">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{tool.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>📋 Submission Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Google Search Console:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Click "Submit Sitemap" button above</li>
                <li>Sign in with your Google account</li>
                <li>Add property: https://gangrunprinting.com</li>
                <li>Verify ownership (DNS or HTML file method)</li>
                <li>Go to Sitemaps section</li>
                <li>Paste sitemap URL: {sitemapUrl}</li>
                <li>Click "Submit"</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Bing Webmaster Tools:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Click "Submit Sitemap" button above</li>
                <li>Sign in with Microsoft account</li>
                <li>Add your site: https://gangrunprinting.com</li>
                <li>Verify ownership</li>
                <li>Go to Sitemaps section</li>
                <li>Submit sitemap URL: {sitemapUrl}</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Pro Tip:</strong> After submitting, it may take 24-48 hours for search
                engines to crawl your sitemap. Check back regularly to monitor indexing status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
