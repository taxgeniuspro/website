'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, Eye, ImageIcon, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import toast from '@/lib/toast'

interface Product {
  // Keep lowercase id for API calls
  id: string
  // API returns PascalCase properties for display
  Id: string
  Name: string
  Slug: string
  Sku?: string
  ProductCategory: {
    Id: string
    Name: string
  } | null
  BasePrice: number
  TurnaroundTime?: number
  IsActive: boolean
  IsFeatured: boolean
  GangRunEligible?: boolean
  ProductImages?: Array<{
    Id: string
    Url: string
    ThumbnailUrl?: string
    AltText?: string
    IsPrimary: boolean
  }>
  ProductPaperStocks?: Array<{
    paperStock: {
      id: string
      name: string
      coating?: string
      sides?: string
    }
    isDefault: boolean
  }>
  _count?: {
    productImages: number
    productPaperStocks: number
    productOptions: number
  }
  // Backward compatibility fields
  productCategory?: any
  productImages?: any
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0) // Track total count from API

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      // FIXED: Fetch more products (increased limit to 1000) and get total count
      const response = await fetch('/api/products?limit=1000')
      if (response.ok) {
        const result = await response.json()
        // Handle both {data: [...]} and direct array responses
        const productsData = Array.isArray(result) ? result : result.data || []
        // Ensure it's always an array
        setProducts(Array.isArray(productsData) ? productsData : [])
        // Set total count from API metadata (if available)
        setTotalCount(result.meta?.totalCount || productsData.length)
      } else {
        toast.error('Failed to load products')
        setProducts([]) // Set empty array on error
        setTotalCount(0)
      }
    } catch (error) {
      toast.error('Failed to load products')
      setProducts([]) // Set empty array on error
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })

      if (response.ok) {
        toast.success('Product deleted')
        fetchProducts()
      } else {
        const errorData = await response.json()
        console.error('[Admin] Delete failed:', errorData)
        toast.error(errorData.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('[Admin] Delete error:', error)
      toast.error(
        'Failed to delete product: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  }

  const toggleActive = async (productId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })

      if (response.ok) {
        toast.success(`Product ${!isActive ? 'activated' : 'deactivated'}`)
        fetchProducts()
      } else {
        throw new Error('Failed to update product')
      }
    } catch (error) {
      toast.error('Failed to update product')
    }
  }

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !isFeatured }),
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })

      if (response.ok) {
        toast.success(`Product ${!isFeatured ? 'featured' : 'unfeatured'}`)
        fetchProducts()
      } else {
        throw new Error('Failed to update product')
      }
    } catch (error) {
      toast.error('Failed to update product')
    }
  }

  const handleDuplicate = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/products/${id}/duplicate`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Product "${name}" duplicated successfully`)
        fetchProducts()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate product')
      }
    } catch (error) {
      toast.error('Failed to duplicate product')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">Manage your print products and configurations</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter((p) => p.IsActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter((p) => p.IsFeatured).length}</div>
            <p className="text-xs text-muted-foreground">Featured products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gang Run Eligible</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.GangRunEligible).length}
            </div>
            <p className="text-xs text-muted-foreground">Can be gang run</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                products.filter(
                  (p) => (p._count?.productImages || 0) > 0 || (p.ProductImages?.length || 0) > 0
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Have product images</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paper Stocks</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Production</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={8}>
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={8}>
                    No products found. Create your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.Id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {(product.ProductImages?.length || 0) > 0 && product.ProductImages ? (
                          <img
                            alt={product.ProductImages[0].AltText || product.Name}
                            className="w-10 h-10 rounded object-cover bg-gray-100"
                            loading="lazy"
                            src={
                              product.ProductImages[0].ThumbnailUrl || product.ProductImages[0].Url
                            }
                            onError={(e) => {
                              e.currentTarget.src = '/images/product-placeholder.jpg'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.Name}</p>
                          <p className="text-sm text-muted-foreground">{product.Slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.Sku || 'N/A'}</TableCell>
                    <TableCell>{product.ProductCategory?.Name || 'Uncategorized'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {product._count?.productPaperStocks ||
                            product.ProductPaperStocks?.length ||
                            0}{' '}
                          stocks
                        </span>
                        {product.ProductPaperStocks?.[0] && (
                          <span className="text-xs text-muted-foreground">
                            Default: {product.ProductPaperStocks[0].paperStock?.name || 'N/A'}
                            {product.ProductPaperStocks[0].paperStock?.coating &&
                              product.ProductPaperStocks[0].paperStock.coating !== 'None' &&
                              ` (${product.ProductPaperStocks[0].paperStock.coating})`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${(product.BasePrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{product.TurnaroundTime || 'N/A'} days</span>
                        {product.GangRunEligible && (
                          <Badge className="text-xs w-fit" variant="outline">
                            Gang Run
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className="w-fit cursor-pointer"
                          variant={product.IsActive ? 'default' : 'secondary'}
                          onClick={() => toggleActive(product.id, product.IsActive)}
                        >
                          {product.IsActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.IsFeatured && (
                          <Badge
                            className="w-fit text-xs cursor-pointer"
                            variant="outline"
                            onClick={() => toggleFeatured(product.id, product.IsFeatured)}
                          >
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {product.IsActive ? (
                          <Link href={`/products/${product.Slug}`} target="_blank">
                            <Button size="sm" title="View Product" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            disabled
                            className="opacity-50 cursor-not-allowed"
                            size="sm"
                            title="Product is inactive - activate it first to view publicly"
                            variant="ghost"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button size="sm" title="Edit Product" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          title="Duplicate Product"
                          variant="ghost"
                          onClick={() => handleDuplicate(product.id, product.Name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          title="Delete Product"
                          variant="ghost"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
