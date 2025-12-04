'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductImageUpload } from '@/components/admin/product-image-upload'
import { Checkbox } from '@/components/ui/checkbox'

import toast from '@/lib/toast'
import { ArrowLeft, Save, Loader2, Eye } from 'lucide-react'
import Link from 'next/link'

interface ProductImage {
  id?: string
  imageId?: string // ID of the underlying Image record
  url: string
  thumbnailUrl?: string
  largeUrl?: string
  mediumUrl?: string
  webpUrl?: string
  blurDataUrl?: string
  alt?: string
  caption?: string
  isPrimary: boolean
  sortOrder: number
  file?: File
  uploading?: boolean
}

interface EditProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  return <EditProductClient id={id} />
}

function EditProductClient({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [paperStockSets, setPaperStockSets] = useState<any[]>([])
  const [quantityGroups, setQuantityGroups] = useState<any[]>([])
  const [sizeGroups, setSizeGroups] = useState<any[]>([])
  const [addOnSets, setAddOnSets] = useState<any[]>([])
  const [turnaroundTimeSets, setTurnaroundTimeSets] = useState<any[]>([])
  const [designSets, setDesignSets] = useState<any[]>([])

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    sku: '',
    categoryId: '',
    description: '',
    shortDescription: '',
    isActive: true,
    isFeatured: false,
    images: [] as ProductImage[],

    // Paper Stock Set - Single selection
    selectedPaperStockSet: '', // Single paper stock set ID

    // Single selections
    selectedQuantityGroup: '', // Single quantity group ID
    selectedSizeGroup: '', // Single size group ID
    selectedAddOnSet: '', // Single addon set ID
    selectedTurnaroundTimeSet: '', // Single turnaround time set ID
    selectedDesignSet: '', // Single design set ID

    // Turnaround
    productionTime: 3,
    rushAvailable: false,
    rushDays: 1,
    rushFee: 0,

    // Pricing
    basePrice: 0,
    setupFee: 0,
  })

  useEffect(() => {
    fetchData()
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })
      if (!res.ok) throw new Error('Failed to fetch product')
      const response = await res.json()

      // Handle both direct response and wrapped response with data property
      const data = response.data || response

      // Map the product data to form data structure
      const mappedData = {
        name: data.name || data.Name || '',
        sku: data.sku || data.Sku || '',
        categoryId: data.categoryId || data.CategoryId || '',
        description: data.description || data.Description || '',
        shortDescription: data.shortDescription || data.ShortDescription || '',
        isActive: data.isActive ?? data.IsActive ?? true,
        isFeatured: data.isFeatured ?? data.IsFeatured ?? false,
        // FIX BUG #7: Transform ProductImages to flat array
        images: (data.ProductImages || data.productImages || []).map((pi: any) => ({
          id: pi.imageId || pi.ImageId,
          imageId: pi.imageId || pi.ImageId,
          url: pi.Image?.url || pi.Image?.Url || pi.url || pi.Url,
          thumbnailUrl: pi.Image?.thumbnailUrl || pi.Image?.ThumbnailUrl || pi.thumbnailUrl,
          largeUrl: pi.Image?.largeUrl || pi.Image?.LargeUrl || pi.largeUrl,
          mediumUrl: pi.Image?.mediumUrl || pi.Image?.MediumUrl || pi.mediumUrl,
          webpUrl: pi.Image?.webpUrl || pi.Image?.WebpUrl || pi.webpUrl,
          blurDataUrl: pi.Image?.blurDataUrl || pi.Image?.BlurDataUrl || pi.blurDataUrl,
          alt: pi.Image?.alt || pi.Image?.Alt || pi.alt || pi.Alt,
          caption: pi.Image?.caption || pi.Image?.Caption || pi.caption,
          isPrimary: pi.isPrimary ?? pi.IsPrimary ?? false,
          sortOrder: pi.sortOrder ?? pi.SortOrder ?? 0,
        })),

        // Map paper stock set
        selectedPaperStockSet:
          data.productPaperStockSets?.[0]?.paperStockSetId ||
          data.productPaperStockSets?.[0]?.PaperStockSet?.id ||
          '',

        // Map quantity and size groups
        selectedQuantityGroup:
          data.productQuantityGroups?.[0]?.quantityGroupId ||
          data.productQuantityGroups?.[0]?.QuantityGroup?.id ||
          '',
        selectedSizeGroup:
          data.productSizeGroups?.[0]?.sizeGroupId ||
          data.productSizeGroups?.[0]?.SizeGroup?.id ||
          '',
        selectedAddOnSet:
          data.productAddOnSets?.[0]?.addOnSetId || data.productAddOnSets?.[0]?.AddOnSet?.id || '',
        selectedTurnaroundTimeSet:
          data.productTurnaroundTimeSets?.[0]?.turnaroundTimeSetId ||
          data.productTurnaroundTimeSets?.[0]?.TurnaroundTimeSet?.id ||
          '',
        selectedDesignSet:
          data.productDesignSets?.[0]?.designSetId ||
          data.productDesignSets?.[0]?.DesignSet?.id ||
          '',

        // Turnaround times
        productionTime: data.productionTime || data.ProductionTime || 3,
        rushAvailable: data.rushAvailable || data.RushAvailable || false,
        rushDays: data.rushDays || data.RushDays || 1,
        rushFee: data.rushFee || data.RushFee || 0,

        // Pricing
        basePrice: data.basePrice || data.BasePrice || 0,
        setupFee: data.setupFee || data.SetupFee || 0,
      }

      //   selectedPaperStockSet: mappedData.selectedPaperStockSet,
      //   selectedTurnaroundTimeSet: mappedData.selectedTurnaroundTimeSet,
      //   selectedQuantityGroup: mappedData.selectedQuantityGroup,
      //   selectedSizeGroup: mappedData.selectedSizeGroup,
      // })

      setFormData(mappedData)
    } catch (error) {
      console.error('[Edit Product] Error loading product:', error)
      toast.error('Failed to load product')
    } finally {
      setLoadingProduct(false)
    }
  }

  const fetchData = async () => {
    try {
      const [catRes, paperRes, qtyRes, sizeRes, addOnRes, turnaroundRes, designRes] =
        await Promise.all([
          fetch('/api/product-categories'),
          fetch('/api/paper-stock-sets'),
          fetch('/api/quantities'),
          fetch('/api/sizes'),
          fetch('/api/addon-sets'),
          fetch('/api/turnaround-time-sets'),
          fetch('/api/design-sets'),
        ])

      if (catRes.ok) {
        const cats = await catRes.json()
        setCategories(cats)
      }
      if (paperRes.ok) {
        const papers = await paperRes.json()
        setPaperStockSets(papers)
      }
      if (qtyRes.ok) {
        const qtys = await qtyRes.json()
        setQuantityGroups(qtys)
      }
      if (sizeRes.ok) {
        const sizes = await sizeRes.json()
        setSizeGroups(sizes)
      }
      if (addOnRes.ok) {
        const addons = await addOnRes.json()
        setAddOnSets(addons)
      }
      if (turnaroundRes.ok) {
        const turnarounds = await turnaroundRes.json()
        setTurnaroundTimeSets(turnarounds)
      }
      if (designRes.ok) {
        const designs = await designRes.json()
        setDesignSets(designs)
      }
    } catch (error) {
      console.error('[Edit Product] Error fetching configuration data:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku || !formData.categoryId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.selectedPaperStockSet) {
      toast.error('Please select a paper stock set')
      return
    }

    if (!formData.selectedQuantityGroup) {
      toast.error('Please select a quantity group')
      return
    }

    if (!formData.selectedSizeGroup) {
      toast.error('Please select a size group')
      return
    }

    setLoading(true)
    try {
      // Transform form data to match API expectations
      const {
        selectedPaperStockSet,
        selectedQuantityGroup,
        selectedSizeGroup,
        selectedAddOnSet,
        selectedTurnaroundTimeSet,
        selectedDesignSet,
        ...otherFormData
      } = formData

      // FIX BUG #8: Include images in update payload
      const apiData = {
        ...otherFormData,
        paperStockSetId: selectedPaperStockSet,
        quantityGroupId: selectedQuantityGroup,
        sizeGroupId: selectedSizeGroup,
        addOnSetId: selectedAddOnSet || null,
        turnaroundTimeSetId: selectedTurnaroundTimeSet,
        designSetId: selectedDesignSet || null,
        options: [], // Add empty options array
        pricingTiers: [], // Add empty pricing tiers array
        images: formData.images.map((image, index) => ({
          imageId: image.imageId || image.id,
          url: image.url,
          ...(image.thumbnailUrl && { thumbnailUrl: image.thumbnailUrl }),
          ...(image.largeUrl && { largeUrl: image.largeUrl }),
          ...(image.mediumUrl && { mediumUrl: image.mediumUrl }),
          ...(image.webpUrl && { webpUrl: image.webpUrl }),
          ...(image.blurDataUrl && { blurDataUrl: image.blurDataUrl }),
          alt: image.alt || `${formData.name} product image ${index + 1}`,
          caption: image.caption || null,
          isPrimary: image.isPrimary !== false && index === 0,
          sortOrder: image.sortOrder ?? index,
        })),
      }

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
        credentials: 'include', // CRITICAL: Send auth cookies with request
      })

      if (response.ok) {
        toast.success('Product updated successfully')
        router.push('/admin/products')
      } else {
        const errorData = await response.json()
        console.error('[Edit Product] Update failed:', errorData)
        toast.error(errorData.error || errorData.details || 'Failed to update product')
        throw new Error(errorData.error || 'Failed to update product')
      }
    } catch (error) {
      console.error('[Edit Product] Error:', error)
      toast.error(
        'Failed to update product: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setLoading(false)
    }
  }

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="sm" variant="ghost" onClick={() => router.push('/admin/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Product</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/${formData.sku}`} target="_blank">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Product
            </Button>
          </Link>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Save Changes</span>
          </Button>
        </div>
      </div>

      {/* Basic Info & Images */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info & Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Product Images</Label>
            <ProductImageUpload
              images={formData.images}
              productId={id}
              onImagesChange={(imagesOrCallback) => {
                // Handle both array and callback forms
                if (typeof imagesOrCallback === 'function') {
                  setFormData((prev) => ({ ...prev, images: imagesOrCallback(prev.images) }))
                } else {
                  setFormData({ ...formData, images: imagesOrCallback })
                }
              }}
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
              />
              <Label>Featured</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity Group - Single selection */}
      <Card>
        <CardHeader>
          <CardTitle>Quantity Set (Choose One) *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a quantity set for this product. Customers will see the quantities from this
              set, with the default quantity pre-selected.
            </p>
            <div>
              <Label htmlFor="quantity-group">Quantity Set</Label>
              <Select
                value={formData.selectedQuantityGroup}
                onValueChange={(value) =>
                  setFormData({ ...formData, selectedQuantityGroup: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quantity set" />
                </SelectTrigger>
                <SelectContent>
                  {quantityGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{group.name}</span>
                        {group.description && (
                          <span className="text-xs text-muted-foreground">{group.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview selected quantity group */}
            {formData.selectedQuantityGroup && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedGroup = quantityGroups.find(
                    (g) => g.id === formData.selectedQuantityGroup
                  )
                  if (!selectedGroup) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">Preview: {selectedGroup.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedGroup.valuesList?.map((value: string, index: number) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded ${
                              value === selectedGroup.defaultValue
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'bg-background text-foreground border'
                            }`}
                          >
                            {value}
                            {value === selectedGroup.defaultValue && ' (default)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paper Stock Set - Single selection */}
      <Card>
        <CardHeader>
          <CardTitle>Paper Stock Set (Choose One) *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a paper stock set for this product. Customers will see the paper stocks from
              this set, with the default paper stock pre-selected.
            </p>
            <div>
              <Label htmlFor="paper-stock-set">Paper Stock Set</Label>
              <Select
                value={formData.selectedPaperStockSet}
                onValueChange={(value) =>
                  setFormData({ ...formData, selectedPaperStockSet: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select paper stock set" />
                </SelectTrigger>
                <SelectContent>
                  {paperStockSets.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{group.name}</span>
                        {group.description && (
                          <span className="text-xs text-muted-foreground">{group.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview selected paper stock set */}
            {formData.selectedPaperStockSet && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedGroup = paperStockSets.find(
                    (g) => g.id === formData.selectedPaperStockSet
                  )
                  if (!selectedGroup) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">Preview: {selectedGroup.name}</p>
                      <div className="space-y-1">
                        {selectedGroup.paperStockItems?.map((item: any) => (
                          <div
                            key={item.id}
                            className={`px-2 py-1 text-xs rounded flex items-center justify-between ${
                              item.isDefault
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'bg-background text-foreground border'
                            }`}
                          >
                            <span>
                              {item.paperStock.name} - {item.paperStock.weight}pt
                            </span>
                            <span className="text-xs opacity-70">
                              ${item.paperStock.pricePerSqInch}/sq in
                              {item.isDefault && ' (default)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Size Group - Single selection */}
      <Card>
        <CardHeader>
          <CardTitle>Size Set (Choose One) *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a size set for this product. Customers will see the sizes from this set, with
              the default size pre-selected.
            </p>
            <div>
              <Label htmlFor="size-group">Size Set</Label>
              <Select
                value={formData.selectedSizeGroup}
                onValueChange={(value) => setFormData({ ...formData, selectedSizeGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size set" />
                </SelectTrigger>
                <SelectContent>
                  {sizeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{group.name}</span>
                        {group.description && (
                          <span className="text-xs text-muted-foreground">{group.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview selected size group */}
            {formData.selectedSizeGroup && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedGroup = sizeGroups.find((g) => g.id === formData.selectedSizeGroup)
                  if (!selectedGroup) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">Preview: {selectedGroup.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedGroup.valuesList?.map((value: string, index: number) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded ${
                              value === selectedGroup.defaultValue
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'bg-background text-foreground border'
                            }`}
                          >
                            {value}
                            {value === selectedGroup.defaultValue && ' (default)'}
                          </span>
                        ))}
                      </div>
                      {selectedGroup.hasCustomOption && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Custom dimensions: {selectedGroup.customMinWidth}"×
                          {selectedGroup.customMinHeight}" to {selectedGroup.customMaxWidth}"×
                          {selectedGroup.customMaxHeight}"
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Turnaround Time Set - Single selection */}
      <Card>
        <CardHeader>
          <CardTitle>Turnaround Time Set (Choose One) *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a turnaround time set for this product. Customers will see the turnaround
              options from this set, with pricing adjustments for faster delivery.
            </p>
            <div>
              <Label htmlFor="turnaround-time-set">Turnaround Time Set</Label>
              <Select
                value={formData.selectedTurnaroundTimeSet}
                onValueChange={(value) =>
                  setFormData({ ...formData, selectedTurnaroundTimeSet: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select turnaround time set" />
                </SelectTrigger>
                <SelectContent>
                  {turnaroundTimeSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{set.name}</span>
                        {set.description && (
                          <span className="text-xs text-muted-foreground">{set.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview selected turnaround time set */}
            {formData.selectedTurnaroundTimeSet && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedSet = turnaroundTimeSets.find(
                    (s) => s.id === formData.selectedTurnaroundTimeSet
                  )
                  if (!selectedSet) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">Preview: {selectedSet.name}</p>
                      <div className="space-y-1">
                        {selectedSet.turnaroundTimeItems?.map((item: any) => (
                          <div
                            key={item.id}
                            className={`px-2 py-1 text-xs rounded flex items-center justify-between ${
                              item.isDefault
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'bg-background text-foreground border'
                            }`}
                          >
                            <span>{item.turnaroundTime.displayName}</span>
                            <span className="text-xs opacity-70">
                              {item.turnaroundTime.basePrice > 0 &&
                                `+$${item.turnaroundTime.basePrice}`}
                              {item.isDefault && ' (default)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Design Set - Single selection (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Design Services (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a design set if you want to offer design services with this product. Design
              services are optional and have their own pricing.
            </p>
            <div>
              <Label htmlFor="design-set">Design Set</Label>
              <Select
                value={formData.selectedDesignSet || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, selectedDesignSet: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No design services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No design services</SelectItem>
                  {designSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{set.name}</span>
                        {set.description && (
                          <span className="text-xs text-muted-foreground">{set.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview selected design set */}
            {formData.selectedDesignSet && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedSet = designSets.find((s) => s.id === formData.selectedDesignSet)
                  if (!selectedSet) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">Preview: {selectedSet.name}</p>
                      <div className="space-y-1">
                        {selectedSet.designSetItems?.map((item: any) => (
                          <div
                            key={item.id}
                            className={`px-2 py-1 text-xs rounded flex items-center justify-between ${
                              item.isDefault
                                ? 'bg-purple-100 text-purple-900 font-medium border border-purple-300'
                                : 'bg-background text-foreground border'
                            }`}
                          >
                            <span>{item.designOption.name}</span>
                            <span className="text-xs opacity-70">
                              ${item.designOption.basePrice}
                              {item.isDefault && ' (default)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
