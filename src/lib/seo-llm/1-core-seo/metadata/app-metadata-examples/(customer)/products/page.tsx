'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Grid3x3,
  List,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

// Types for API data
type ProductCategory = {
  id: string
  name: string
  slug: string
  description?: string
  sortOrder: number
  isActive: boolean
  _count: {
    products: number
  }
}

type Product = {
  id: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  basePrice: number
  isActive: boolean
  isFeatured: boolean
  productCategory?: ProductCategory
  ProductCategory?: ProductCategory // For backward compatibility
  productImages?: Array<{
    url: string
    thumbnailUrl?: string
    alt?: string
    isPrimary: boolean
  }>
  ProductImage?: Array<{
    url: string
    thumbnailUrl?: string
    alt?: string
    isPrimary: boolean
  }> // For backward compatibility
}
const sortOptions = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Name A-Z', value: 'name-asc' },
]

function ProductsPageContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('featured')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // API data state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Category expansion state for dropdowns
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Fetch categories and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setFetchError(null)

        // Fetch categories and products in parallel
        const [categoriesResponse, productsResponse] = await Promise.all([
          fetch('/api/product-categories?active=true&withProducts=true'),
          fetch('/api/products?isActive=true'),
        ])

        if (!categoriesResponse.ok) {
          throw new Error('Failed to fetch categories')
        }
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products')
        }

        const [categoriesData, productsData] = await Promise.all([
          categoriesResponse.json(),
          productsResponse.json(),
        ])

        setCategories(categoriesData)
        // API returns { data: [...], pagination: {...} } so extract the data array
        setProducts(productsData.data || productsData)
      } catch (error) {
        setFetchError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle URL search parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam && categories.length > 0) {
      // Find category by slug
      const category = categories.find((cat) => cat.slug === categoryParam)
      if (category && !selectedCategories.includes(category.name)) {
        setSelectedCategories([category.name])
      }
    }
  }, [searchParams, selectedCategories, categories])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const name = product.name || ''
      const description = product.description || ''
      const shortDescription = product.shortDescription || ''

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (description && description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (shortDescription && shortDescription.toLowerCase().includes(searchQuery.toLowerCase()))

      const category = product.productCategory
      const categoryName = category?.name || ''
      const productId = product.id || ''

      const matchesSelection =
        (selectedCategories.length === 0 && selectedProducts.length === 0) ||
        (categoryName && selectedCategories.includes(categoryName)) ||
        selectedProducts.includes(productId)

      return matchesSearch && matchesSelection
    })
  }, [searchQuery, selectedCategories, selectedProducts, products])

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0))
      case 'price-desc':
        return sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0))
      case 'name-asc':
        return sorted.sort((a, b) => {
          const aName = a.name || ''
          const bName = b.name || ''
          return aName.localeCompare(bName)
        })
      default: // featured
        return sorted.sort((a, b) => {
          const aFeatured = a.isFeatured ?? false
          const bFeatured = b.isFeatured ?? false
          return (bFeatured ? 1 : 0) - (aFeatured ? 1 : 0)
        })
    }
  }, [filteredProducts, sortBy])

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
    // Clear any individually selected products from this category when toggling category
    if (!selectedCategories.includes(category)) {
      const categoryProducts = products
        .filter((p) => {
          const cat = p.productCategory || p.ProductCategory
          return cat && cat.name === category
        })
        .map((p) => p.id)
      setSelectedProducts((prev) => prev.filter((id) => !categoryProducts.includes(id)))
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    )
  }

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedProducts([])
    setSearchQuery('')
  }

  const activeFiltersCount = selectedCategories.length + selectedProducts.length

  // Group products by category for dropdown display
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    products.forEach((product) => {
      // Skip products without a category
      const category = product.productCategory || product.ProductCategory
      if (!category || !category.name) return

      const categoryName = category.name
      if (!grouped[categoryName]) {
        grouped[categoryName] = []
      }
      grouped[categoryName].push(product)
    })
    return grouped
  }, [products])

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Categories with Product Dropdowns */}
      <div className="space-y-2">
        {categories
          .filter((category) => category && category.isActive)
          .sort((a, b) => (a?.sortOrder || 0) - (b?.sortOrder || 0))
          .map((category) => {
            if (!category || !category.name) return null
            const categoryProducts = productsByCategory[category.name] || []
            const isExpanded = expandedCategories.includes(category.id)

            return (
              <div key={category.id} className="border rounded-lg">
                {/* Category Header */}
                <div className="flex items-center space-x-2 p-3">
                  <Checkbox
                    checked={selectedCategories.includes(category.name)}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    id={`category-${category.id}`}
                    onCheckedChange={() => toggleCategory(category.name)}
                  />
                  <Label
                    className="text-sm font-medium cursor-pointer flex-1"
                    htmlFor={`category-${category.id}`}
                  >
                    {category.name}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({category._count?.products || 0})
                    </span>
                  </Label>
                  <Button
                    className="h-6 w-6 p-0"
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Product Dropdown */}
                <Collapsible open={isExpanded}>
                  <CollapsibleContent className="px-6 pb-3">
                    <div className="space-y-2 border-t pt-2">
                      {categoryProducts.map((product) => {
                        if (!product || !product.id || !product.name) return null
                        return (
                          <div key={product.id} className="flex items-center space-x-2 pl-4">
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              id={`product-${product.id}`}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                            <Label
                              className="text-xs font-normal cursor-pointer text-muted-foreground"
                              htmlFor={`product-${product.id}`}
                            >
                              {product.name}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          })}
      </div>

      {activeFiltersCount > 0 && (
        <Button className="w-full" variant="outline" onClick={clearFilters}>
          Clear All
        </Button>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Our Products</h1>
        <p className="text-muted-foreground">
          Browse our wide selection of printing products and services
        </p>
      </div>

      {/* Search and Controls Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search products..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {/* Mobile Categories Toggle */}
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button className="lg:hidden" variant="outline">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Categories
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-primary text-primary-foreground">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[300px]" side="right">
                <SheetHeader>
                  <SheetTitle>Product Categories</SheetTitle>
                  <SheetDescription>Browse products by category</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sort
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={sortBy === option.value ? 'bg-primary/10' : ''}
                    onClick={() => setSortBy(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <Button
                className="rounded-r-none"
                size="icon"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                className="rounded-l-none"
                size="icon"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge
                key={`category-${category}`}
                className="bg-primary/10 text-primary border-primary/20"
                variant="secondary"
              >
                {category} (Category)
                <button
                  className="ml-2 hover:text-primary-foreground"
                  onClick={() => toggleCategory(category)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedProducts.map((productId) => {
              const product = products.find((p) => p.id === productId)
              return product ? (
                <Badge
                  key={`product-${productId}`}
                  className="bg-secondary/10 text-secondary-foreground border-secondary/20"
                  variant="secondary"
                >
                  {product.name}
                  <button
                    className="ml-2 hover:text-secondary-foreground"
                    onClick={() => toggleProduct(productId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Products Grid/List */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {sortedProducts.length} of {products.length} products
            </p>
          </div>

          {fetchError ? (
            <Card className="p-12">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Error loading products: {fetchError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </Card>
          ) : isLoading ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 mb-2" />
                    <Skeleton className="h-4 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedProducts.map((product) => {
                const images = product.productImages || []
                const primaryImage = images.find((img) => img.isPrimary) || images[0]
                const slug = product.slug || product.id
                const productName = product.name || 'Product'
                return (
                  <Link key={product.id} href={`/products/${slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-primary/50 group cursor-pointer h-full">
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                        {product.isFeatured && (
                          <Badge className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground">
                            Featured
                          </Badge>
                        )}
                        <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform relative">
                          {primaryImage ? (
                            <Image
                              fill
                              alt={primaryImage.alt || productName}
                              className="w-full h-full object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              src={primaryImage.thumbnailUrl || primaryImage.url}
                            />
                          ) : (
                            <Package className="h-20 w-20 text-primary/30" />
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {productName}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {product.productCategory?.name || 'Uncategorized'}
                        </p>
                        <p className="text-sm mb-3 line-clamp-2">
                          {product.shortDescription || product.description || ''}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-muted-foreground">Starting at</span>
                            <p className="text-lg font-bold text-primary">
                              ${(product.basePrice || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map((product) => {
                const images = product.productImages || []
                const primaryImage = images.find((img) => img.isPrimary) || images[0]
                const slug = product.slug || product.id
                const productName = product.name || 'Product'
                return (
                  <Link key={product.id} href={`/products/${slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-primary/50 group cursor-pointer">
                      <div className="flex">
                        <div className="w-48 bg-gradient-to-br from-primary/10 to-primary/5 relative flex-shrink-0">
                          {product.isFeatured && (
                            <Badge className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground">
                              Featured
                            </Badge>
                          )}
                          <div className="w-full h-full flex items-center justify-center relative">
                            {primaryImage ? (
                              <Image
                                fill
                                alt={primaryImage.alt || productName}
                                className="w-full h-full object-cover"
                                sizes="192px"
                                src={primaryImage.thumbnailUrl || primaryImage.url}
                              />
                            ) : (
                              <Package className="h-16 w-16 text-primary/30" />
                            )}
                          </div>
                        </div>
                        <CardContent className="flex-1 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-xl mb-1 group-hover:text-primary transition-colors">
                                {productName}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {product.productCategory?.name || 'Uncategorized'}
                              </p>
                              <p className="text-sm mb-3">
                                {product.shortDescription || product.description || ''}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <span className="text-sm text-muted-foreground">Starting at</span>
                              <p className="text-2xl font-bold text-primary">
                                ${(product.basePrice || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {sortedProducts.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No products found matching your criteria.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Desktop Categories Sidebar - Right Side */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Product Categories</h2>
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">{activeFiltersCount}</Badge>
              )}
            </div>
            <FilterContent />
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-80 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  )
}
