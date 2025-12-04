'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ProductImageUpload } from '@/components/admin/product-image-upload' // Multi-image upload component
import { AIProductDesigner } from '@/components/admin/ai-product-designer'
import { useProductForm } from '@/hooks/use-product-form'
import toast from '@/lib/toast'
import { ArrowLeft, Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { responseToJsonSafely } from '@/lib/safe-json'

export default function NewProductPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    formData,
    options,
    loading,
    errors,
    updateFormData,
    fetchOptions,
    validateForm,
    transformForSubmission,
  } = useProductForm()

  useEffect(() => {
    fetchOptions()
  }, [])

  const handleSubmit = async () => {
    // DEBUG: Log form state before validation to diagnose issues
    //   name: formData.name,
    //   categoryId: formData.categoryId,
    //   images: formData.images,
    //   imagesIsArray: Array.isArray(formData.images),
    //   imagesLength: Array.isArray(formData.images) ? formData.images.length : 'NOT AN ARRAY',
    //   hasBlobs: Array.isArray(formData.images)
    //     ? formData.images.some((img) => img.url?.startsWith('blob:'))
    //     : 'CANNOT CHECK',
    // })

    // Enhanced validation with specific error messages
    const validationErrors = []
    if (!formData.name) validationErrors.push('Product name is required')
    if (!formData.categoryId) validationErrors.push('Category must be selected')
    if (!formData.selectedQuantityGroup) validationErrors.push('Quantity group must be selected')
    if (!formData.selectedSizeGroup) validationErrors.push('Size group must be selected')
    if (!formData.selectedPaperStockSet) validationErrors.push('Paper stock must be selected')

    if (validationErrors.length > 0) {
      toast.error(`Please fix the following:\n${validationErrors.join('\n')}`)
      return
    }

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const productData = await transformForSubmission()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
        credentials: 'include', // CRITICAL: Send auth cookies with request
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = 'Failed to create product'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.data?.error || errorMessage

          if (errorData.details?.validationErrors) {
            const validationMessages = errorData.details.validationErrors
              .map((err: Record<string, unknown>) => `${err.field}: ${err.message}`)
              .join(', ')
            errorMessage = `Validation failed: ${validationMessages}`
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      const product = responseData.data || responseData
      if (!product || !product.id) {
        throw new Error('Invalid product response: missing product data')
      }

      toast.success('Product created successfully')
      router.push('/admin/products')
      router.refresh() // Force Next.js cache invalidation to show new product
    } catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        toast.error('Request timeout. Please try again.')
      } else if (err.message?.includes('fetch')) {
        toast.error('Network error. Please check your internet connection.')
      } else {
        toast.error(err.message || 'Failed to create product')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  )

  if (loading) {
    return <LoadingSkeleton />
  }

  const criticalErrors = [
    errors.categories,
    errors.paperStockSets,
    errors.quantityGroups,
    errors.sizeGroups,
  ].filter(Boolean)

  if (criticalErrors.length > 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" onClick={() => router.push('/admin/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Create Product</h1>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Required Data</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              Some required data could not be loaded. This prevents the product creation form from
              working properly.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => fetchOptions()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push('/admin/products')}>
                Return to Products
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Handle AI-generated content
  const handleAIContentGenerated = (seoContent: any) => {
    updateFormData({
      name: seoContent.name || formData.name,
      description: seoContent.description || formData.description,
    })

    toast.success('AI content applied! Review and adjust as needed.')
  }

  // Quick fill for testing
  const handleQuickFill = () => {
    if (
      options.categories.length > 0 &&
      options.quantityGroups.length > 0 &&
      options.sizeGroups.length > 0 &&
      options.paperStockSets.length > 0
    ) {
      // Find a visible category (not hidden) - prefer "Business Card" if available
      const visibleCategory =
        options.categories.find(
          (cat: any) => cat.name === 'Business Card' || cat.slug === 'business-card'
        ) ||
        options.categories.find((cat: any) => !cat.isHidden) ||
        options.categories[0]

      updateFormData({
        name: 'Test Product ' + Date.now(),
        categoryId: visibleCategory.id,
        description: 'Test product description',
        selectedQuantityGroup: options.quantityGroups[0].id,
        selectedSizeGroup: options.sizeGroups[0].id,
        selectedPaperStockSet: options.paperStockSets[0].id,
        selectedAddOnSet: options.addOnSets.length > 0 ? options.addOnSets[0].id : '',
        selectedTurnaroundTimeSet:
          options.turnaroundTimeSets.length > 0 ? options.turnaroundTimeSets[0].id : '',
        isActive: true,
        isFeatured: false,
      })
      toast.success(`Form filled with test data (Category: ${visibleCategory.name})`)
    } else {
      toast.error('Configuration options not loaded yet')
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button size="sm" variant="ghost" onClick={() => router.push('/admin/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Create Product</h1>
        </div>
        <div className="flex gap-2">
          <AIProductDesigner
            onContentGenerated={handleAIContentGenerated}
            defaultProductName={formData.name}
          />
          <Button
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
            title="Quick fill form with test data"
            variant="outline"
            onClick={handleQuickFill}
          >
            Quick Fill (Test)
          </Button>
          <Button disabled={submitting} type="button" onClick={handleSubmit}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2">{submitting ? 'Creating...' : 'Create Product'}</span>
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
                placeholder="e.g., Premium Business Cards"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU (Auto-generated)</Label>
              <Input
                id="sku"
                placeholder="Auto-generated if left blank"
                value={formData.sku}
                onChange={(e) => updateFormData({ sku: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => updateFormData({ categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {options.categories.map((cat) => (
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
              placeholder="Describe your product..."
              rows={3}
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
            />
          </div>

          <div>
            <Label>Product Images</Label>
            <div className="mt-2">
              <ProductImageUpload
                images={formData.images}
                onImagesChange={(imagesOrCallback) => {
                  // Handle both array and callback forms
                  if (typeof imagesOrCallback === 'function') {
                    updateFormData((prev) => ({ images: imagesOrCallback(prev.images) }))
                  } else {
                    updateFormData({ images: imagesOrCallback })
                  }
                }}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => updateFormData({ isActive: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) => updateFormData({ isFeatured: checked })}
              />
              <Label>Featured</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quantity Set */}
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
                onValueChange={(value) => updateFormData({ selectedQuantityGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quantity set" />
                </SelectTrigger>
                <SelectContent>
                  {options.quantityGroups.map((group) => (
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
                  const selectedGroup = options.quantityGroups.find(
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

      {/* Paper Stock Set */}
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
                onValueChange={(value) => updateFormData({ selectedPaperStockSet: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select paper stock set" />
                </SelectTrigger>
                <SelectContent>
                  {options.paperStockSets.map((group) => (
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
                  const selectedGroup = options.paperStockSets.find(
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

      {/* Size Set */}
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
                onValueChange={(value) => updateFormData({ selectedSizeGroup: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size set" />
                </SelectTrigger>
                <SelectContent>
                  {options.sizeGroups.map((group) => (
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
                  const selectedGroup = options.sizeGroups.find(
                    (g) => g.id === formData.selectedSizeGroup
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

      {/* Turnaround Time Set */}
      <Card>
        <CardHeader>
          <CardTitle>Turnaround Time Set (Choose One)</CardTitle>
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
                value={formData.selectedTurnaroundTimeSet || 'none'}
                onValueChange={(value) =>
                  updateFormData({
                    selectedTurnaroundTimeSet: value === 'none' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No turnaround options" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No turnaround options</SelectItem>
                  {options.turnaroundTimeSets.map((set) => (
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
                  const selectedSet = options.turnaroundTimeSets.find(
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

      {/* Design Set */}
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
                  updateFormData({ selectedDesignSet: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No design services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No design services</SelectItem>
                  {options.designSets.map((set) => (
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
                  const selectedSet = options.designSets.find(
                    (s) => s.id === formData.selectedDesignSet
                  )
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

      {/* Add-on Set */}
      <Card>
        <CardHeader>
          <CardTitle>Add-on Options (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure optional add-ons like special coatings and turnaround times. These settings
              are optional but recommended.
            </p>
            <div>
              <Label htmlFor="addon-set">Add-on Options</Label>
              <Select
                value={formData.selectedAddOnSet || 'none'}
                onValueChange={(value) =>
                  updateFormData({ selectedAddOnSet: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No add-on options" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No add-on options</SelectItem>
                  {options.addOnSets.map((set) => (
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

            {/* Preview selected addon set */}
            {formData.selectedAddOnSet && (
              <div className="border rounded-lg p-3 bg-muted/50">
                {(() => {
                  const selectedSet = options.addOnSets.find(
                    (s) => s.id === formData.selectedAddOnSet
                  )
                  if (!selectedSet) return null

                  return (
                    <div>
                      <p className="font-medium text-sm mb-2">
                        Preview: {selectedSet.name} ({selectedSet.addOnSetItems?.length || 0}{' '}
                        add-ons)
                      </p>
                      <div className="space-y-1">
                        {selectedSet.addOnSetItems?.slice(0, 5).map((item: any) => (
                          <div
                            key={item.id}
                            className="px-2 py-1 text-xs rounded bg-background text-foreground border"
                          >
                            {item.addOn.name}
                          </div>
                        ))}
                        {selectedSet.addOnSetItems && selectedSet.addOnSetItems.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{selectedSet.addOnSetItems.length - 5} more add-ons
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Action Buttons */}
      <div className="flex justify-between items-center py-6 border-t">
        <Button size="sm" variant="ghost" onClick={() => router.push('/admin/products')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button disabled={submitting} size="lg" type="button" onClick={handleSubmit}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-2">{submitting ? 'Creating...' : 'Create Product'}</span>
        </Button>
      </div>
    </div>
  )
}
