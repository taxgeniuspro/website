'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Edit, Trash2, BarChart3, Loader2 } from 'lucide-react'
import toast from '@/lib/toast'

interface LandingPageSet {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  metrics: {
    citiesGenerated: number
    totalViews: number
    totalOrders: number
    totalRevenue: number
    avgConversionRate: number
  }
}

export default function LandingPagesListPage() {
  const router = useRouter()
  const [landingPageSets, setLandingPageSets] = useState<LandingPageSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLandingPageSets()
  }, [])

  const fetchLandingPageSets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/landing-page-sets')

      if (!response.ok) {
        throw new Error('Failed to fetch landing page sets')
      }

      const data = await response.json()
      setLandingPageSets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
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

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Landing Page Sets</h1>
          <p className="text-gray-600 mt-1">
            Create and manage 200-city landing page campaigns for SEO
          </p>
        </div>
        <Button onClick={() => router.push('/admin/landing-pages/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Set
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          <p className="font-medium">Error loading landing page sets</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && landingPageSets.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Landing Page Sets Yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first landing page set to generate 200 city-specific SEO pages and drive
            organic traffic.
          </p>
          <Button onClick={() => router.push('/admin/landing-pages/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Set
          </Button>
        </div>
      )}

      {/* Table */}
      {landingPageSets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cities</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {landingPageSets.map((set) => (
                <TableRow key={set.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{set.name}</p>
                      <p className="text-sm text-gray-500">/{set.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(set.status)}</TableCell>
                  <TableCell className="text-right">
                    {set.metrics.citiesGenerated > 0 ? (
                      <span className="text-green-600 font-medium">
                        {set.metrics.citiesGenerated}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(set.metrics.totalViews)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(set.metrics.totalOrders)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(set.metrics.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {set.metrics.avgConversionRate.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/admin/landing-pages/${set.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/admin/landing-pages/${set.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-600 hover:text-red-700"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete "${set.name}" and all ${set.metrics.citiesGenerated} city pages?`
                            )
                          ) {
                            // TODO: Implement delete
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
