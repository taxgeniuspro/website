'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Rocket,
  Loader2,
  TrendingUp,
  Eye,
  ShoppingCart,
  DollarSign,
  MapPin,
} from 'lucide-react'
import toast from '@/lib/toast'

interface LandingPageSet {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  updatedAt: string

  // Product Configuration
  PaperStockSet: { name: string }
  QuantityGroup: { name: string }
  SizeGroup: { name: string }
  AddOnSet: { name: string } | null
  TurnaroundTimeSet: { name: string } | null

  // Content Templates
  titleTemplate: string
  metaDescTemplate: string
  h1Template: string
  contentTemplate: string

  // AI Generation Settings
  generateIntro: boolean
  generateBenefits: boolean
  generateFAQs: boolean
  generateCaseStudy: boolean

  // SEO Settings
  robotsIndex: boolean
  robotsFollow: boolean

  // Metrics
  metrics: {
    citiesGenerated: number
    totalViews: number
    totalOrders: number
    totalRevenue: number
    avgConversionRate: number
  }
}

export default function LandingPageSetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [landingPageSet, setLandingPageSet] = useState<LandingPageSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchLandingPageSet()
  }, [])

  const fetchLandingPageSet = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/landing-page-sets/${params.id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch landing page set')
      }

      const data = await response.json()
      setLandingPageSet(data)
    } catch (error) {
      console.error('Error fetching landing page set:', error)
      toast.error('Failed to load landing page set')
      router.push('/admin/landing-pages')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!landingPageSet) return

    if (
      !confirm(
        `Publish "${landingPageSet.name}" and generate 200 city landing pages?\n\n` +
          `This will:\n` +
          `✓ Generate unique AI content for each city\n` +
          `✓ Create 200 city-specific landing pages\n` +
          `✓ Optimize for Google SEO standards\n` +
          `✓ Make pages live for search engines\n\n` +
          `This process may take 5-10 minutes.`
      )
    ) {
      return
    }

    try {
      setPublishing(true)
      toast.loading('Publishing landing page set...', { id: 'publish' })

      const response = await fetch(`/api/landing-page-sets/${params.id}/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to publish landing page set')
      }

      const result = await response.json()

      toast.success(`Successfully generated ${result.citiesGenerated} city landing pages!`, {
        id: 'publish',
        duration: 5000,
      })

      // Refresh data
      await fetchLandingPageSet()
    } catch (error) {
      console.error('Error publishing landing page set:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish landing page set', {
        id: 'publish',
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!landingPageSet) return

    if (
      !confirm(
        `Delete "${landingPageSet.name}" and all ${landingPageSet.metrics.citiesGenerated} city pages?\n\n` +
          `⚠️ This action cannot be undone!\n\n` +
          `This will permanently delete:\n` +
          `• The landing page set template\n` +
          `• All ${landingPageSet.metrics.citiesGenerated} city landing pages\n` +
          `• All analytics data (${landingPageSet.metrics.totalViews} views, ${landingPageSet.metrics.totalOrders} orders)\n\n` +
          `Type "DELETE" to confirm`
      )
    ) {
      return
    }

    const confirmText = prompt('Type "DELETE" to confirm deletion:')
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match')
      return
    }

    try {
      setDeleting(true)
      toast.loading('Deleting landing page set...', { id: 'delete' })

      const response = await fetch(`/api/landing-page-sets/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete landing page set')
      }

      toast.success('Landing page set deleted successfully', { id: 'delete' })
      router.push('/admin/landing-pages')
    } catch (error) {
      console.error('Error deleting landing page set:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete landing page set', {
        id: 'delete',
      })
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      generating: 'outline',
      published: 'default',
      archived: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  if (!landingPageSet) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-gray-500">Landing page set not found</p>
          <Button className="mt-4" onClick={() => router.push('/admin/landing-pages')}>
            Back to Landing Pages
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button size="sm" variant="ghost" onClick={() => router.push('/admin/landing-pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{landingPageSet.name}</h1>
              {getStatusBadge(landingPageSet.status)}
            </div>
            <p className="text-gray-600 mt-1">/{landingPageSet.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {landingPageSet.status === 'draft' && (
            <Button disabled={publishing} size="lg" onClick={handlePublish}>
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish & Generate 200 Cities
                </>
              )}
            </Button>
          )}
          <Button
            disabled={landingPageSet.status === 'published'}
            variant="outline"
            onClick={() => router.push(`/admin/landing-pages/${params.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button disabled={deleting} variant="destructive" onClick={handleDelete}>
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      {landingPageSet.status === 'published' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cities Generated</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(landingPageSet.metrics.citiesGenerated)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Live landing pages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(landingPageSet.metrics.totalViews)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Organic search traffic</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(landingPageSet.metrics.totalOrders)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {landingPageSet.metrics.avgConversionRate.toFixed(2)}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(landingPageSet.metrics.totalRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">From landing pages</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Draft Status Message */}
      {landingPageSet.status === 'draft' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
          <p className="font-medium">Draft Mode - Ready to Publish</p>
          <p className="text-sm mt-1">
            Click "Publish & Generate 200 Cities" to create unique landing pages for the top 200 US
            cities. AI will generate unique content for each city following Google SEO best
            practices.
          </p>
        </div>
      )}

      {/* Product Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Configuration</CardTitle>
          <CardDescription>Shared product settings for all 200 city pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Paper Stock Set</p>
              <p className="text-base">{landingPageSet.PaperStockSet.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Quantity Group</p>
              <p className="text-base">{landingPageSet.QuantityGroup.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Size Group</p>
              <p className="text-base">{landingPageSet.SizeGroup.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Add-on Set</p>
              <p className="text-base">{landingPageSet.AddOnSet?.name || 'None'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Turnaround Time Set</p>
              <p className="text-base">{landingPageSet.TurnaroundTimeSet?.name || 'None'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Content Templates</CardTitle>
          <CardDescription>Templates used to generate city-specific content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Page Title Template</p>
            <p className="text-sm bg-gray-50 p-2 rounded border">{landingPageSet.titleTemplate}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Meta Description Template</p>
            <p className="text-sm bg-gray-50 p-2 rounded border">
              {landingPageSet.metaDescTemplate}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">H1 Heading Template</p>
            <p className="text-sm bg-gray-50 p-2 rounded border">{landingPageSet.h1Template}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Content Template</p>
            <p className="text-sm bg-gray-50 p-2 rounded border whitespace-pre-wrap">
              {landingPageSet.contentTemplate}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Generation Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI Generation Settings</CardTitle>
          <CardDescription>Content sections generated by AI for each city</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.generateIntro ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className={landingPageSet.generateIntro ? 'text-gray-900' : 'text-gray-400'}>
                Generate unique introduction (200 words per city)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.generateBenefits ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className={landingPageSet.generateBenefits ? 'text-gray-900' : 'text-gray-400'}>
                Generate benefits section
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.generateFAQs ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className={landingPageSet.generateFAQs ? 'text-gray-900' : 'text-gray-400'}>
                Generate city-specific FAQs (5 questions)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.generateCaseStudy ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span
                className={landingPageSet.generateCaseStudy ? 'text-gray-900' : 'text-gray-400'}
              >
                Generate case studies
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>Search engine optimization configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.robotsIndex ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span>Robots: {landingPageSet.robotsIndex ? 'Index' : 'NoIndex'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${landingPageSet.robotsFollow ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span>Robots: {landingPageSet.robotsFollow ? 'Follow' : 'NoFollow'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Created:</span>{' '}
              <span className="font-medium">
                {new Date(landingPageSet.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>{' '}
              <span className="font-medium">
                {new Date(landingPageSet.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
