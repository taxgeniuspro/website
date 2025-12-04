'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  Save,
  Package,
  Eye,
  EyeOff,
  Folder,
  FolderTree,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from '@/lib/toast'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  isHidden: boolean
  parentCategoryId: string | null
  vendorId: string | null
  brokerDiscount: number
  createdAt: string
  updatedAt: string
  _count?: {
    Product: number
    Subcategories: number
  }
  ParentCategory?: {
    id: string
    name: string
    slug: string
  } | null
  Vendor?: {
    id: string
    name: string
    contactEmail: string
    phone: string | null
  } | null
}

interface Vendor {
  id: string
  name: string
  contactEmail: string
  phone: string | null
  supportedCarriers: string[]
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    thumbnailUrl: '',
    metaTitle: '',
    metaDescription: '',
    seoKeywords: [] as string[],
    sortOrder: 0,
    isActive: true,
    isHidden: false,
    parentCategoryId: '',
    vendorId: '',
    brokerDiscount: 0,
  })

  useEffect(() => {
    fetchCategories()
    fetchVendors()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/product-categories')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors')
      if (!response.ok) throw new Error('Failed to fetch vendors')
      const data = await response.json()
      setVendors(data)
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)

      // Validation
      if (!formData.name) {
        toast.error('Name is required')
        setSaving(false)
        return
      }

      const url = editingCategory
        ? `/api/product-categories/${editingCategory.id}`
        : '/api/product-categories'

      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(
          editingCategory ? 'Category updated successfully' : 'Category created successfully'
        )
        setDialogOpen(false)
        resetForm()
        fetchCategories()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save category')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    try {
      const response = await fetch(`/api/product-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || 'Category deleted successfully')
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
        fetchCategories()
      } else {
        throw new Error('Failed to delete category')
      }
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      thumbnailUrl: '',
      metaTitle: '',
      metaDescription: '',
      seoKeywords: [],
      sortOrder: 0,
      isActive: true,
      isHidden: false,
      parentCategoryId: '',
      vendorId: '',
      brokerDiscount: 0,
    })
    setEditingCategory(null)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: (category as any).imageUrl || '',
      thumbnailUrl: (category as any).thumbnailUrl || '',
      metaTitle: (category as any).metaTitle || '',
      metaDescription: (category as any).metaDescription || '',
      seoKeywords: (category as any).seoKeywords || [],
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      isHidden: category.isHidden,
      parentCategoryId: category.parentCategoryId || '',
      vendorId: category.vendorId || '',
      brokerDiscount: category.brokerDiscount || 0,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: !editingCategory ? generateSlug(name) : formData.slug,
    })
  }

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get parent categories for dropdown
  const parentCategories = categories.filter((cat) => !cat.parentCategoryId)

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Categories Management</CardTitle>
              <CardDescription>
                Manage product categories for your printing services
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories Table */}
          {loading ? (
            <div className="text-center py-8">Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'No categories found matching your search.'
                : 'No categories found. Create your first category to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">
                      <Package className="h-4 w-4 inline mr-1" />
                      Products
                    </TableHead>
                    <TableHead className="text-center">
                      <FolderTree className="h-4 w-4 inline mr-1" />
                      Subs
                    </TableHead>
                    <TableHead className="text-center">
                      <ArrowUpDown className="h-4 w-4 inline" />
                      Order
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {category.parentCategoryId ? (
                            <span className="text-muted-foreground">↳</span>
                          ) : (
                            <Folder className="h-4 w-4 text-muted-foreground" />
                          )}
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">{category.slug}</code>
                      </TableCell>
                      <TableCell>
                        {category.ParentCategory ? (
                          <Badge className="text-xs" variant="outline">
                            {category.ParentCategory.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {category.description || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={category._count?.Product ? 'default' : 'secondary'}>
                          {category._count?.Product || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={category._count?.Subcategories ? 'default' : 'secondary'}>
                          {category._count?.Subcategories || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{category.sortOrder}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className="flex items-center gap-1 w-fit"
                            variant={category.isActive ? 'default' : 'secondary'}
                          >
                            {category.isActive ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {category.isHidden && (
                            <Badge className="text-xs" variant="outline">
                              Hidden from Nav
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(category)}
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

          {/* Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {categories.length} categories • Active:{' '}
            {categories.filter((c) => c.isActive).length} • With Products:{' '}
            {categories.filter((c) => c._count?.Product && c._count.Product > 0).length}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescription>Configure the category details</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="name">
                Name
              </Label>
              <Input
                className="col-span-3"
                id="name"
                placeholder="e.g., Business Cards"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="slug">
                Slug
              </Label>
              <Input
                className="col-span-3"
                id="slug"
                placeholder="e.g., business-cards"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="parentCategoryId">
                Parent Category
              </Label>
              <Select
                value={formData.parentCategoryId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentCategoryId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {parentCategories
                    .filter((cat) => !editingCategory || cat.id !== editingCategory.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="vendorId">
                Vendor
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.vendorId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vendorId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor (determines shipping options)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor (use default shipping)</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}{' '}
                        {vendor.supportedCarriers.length > 0 &&
                          `- ${vendor.supportedCarriers.join(', ')}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground mt-1 block">
                  Vendor determines which shipping carriers are available at checkout
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="description">
                Description
              </Label>
              <Textarea
                className="col-span-3"
                id="description"
                placeholder="Brief description of this category"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* IMAGE & SEO FIELDS */}
            <div className="col-span-4 border-t pt-4">
              <p className="text-sm font-medium mb-3">Images & SEO</p>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="imageUrl">
                Hero Image URL
              </Label>
              <Input
                className="col-span-3"
                id="imageUrl"
                placeholder="https://example.com/category-hero.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="thumbnailUrl">
                Thumbnail URL
              </Label>
              <Input
                className="col-span-3"
                id="thumbnailUrl"
                placeholder="https://example.com/category-thumb.jpg"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="metaTitle">
                SEO Meta Title
              </Label>
              <div className="col-span-3">
                <Input
                  id="metaTitle"
                  maxLength={60}
                  placeholder="e.g., Business Card Printing Services"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Max 60 characters recommended ({formData.metaTitle.length}/60)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="metaDescription">
                SEO Meta Description
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="metaDescription"
                  maxLength={160}
                  placeholder="Brief description for search engines"
                  rows={2}
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Max 160 characters recommended ({formData.metaDescription.length}/160)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="seoKeywords">
                SEO Keywords
              </Label>
              <div className="col-span-3">
                <Input
                  id="seoKeywords"
                  placeholder="business cards, printing, custom cards (comma separated)"
                  value={formData.seoKeywords.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seoKeywords: e.target.value
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Separate keywords with commas
                </span>
              </div>
            </div>

            <div className="col-span-4 border-t pt-4">
              <p className="text-sm font-medium mb-3">Settings</p>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="sortOrder">
                Sort Order
              </Label>
              <Input
                className="col-span-3"
                id="sortOrder"
                placeholder="0"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="brokerDiscount">
                Broker Discount
              </Label>
              <div className="col-span-3">
                <Input
                  id="brokerDiscount"
                  max="100"
                  min="0"
                  placeholder="0"
                  type="number"
                  value={formData.brokerDiscount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brokerDiscount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                    })
                  }
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Default discount percentage (0-100%) applied when customer has broker status
                  enabled
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="isActive">
                Active
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  id="isActive"
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.isActive ? 'Visible to customers' : 'Hidden from customers'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="isHidden">
                Hide from Navigation
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  checked={formData.isHidden}
                  id="isHidden"
                  onCheckedChange={(checked) => setFormData({ ...formData, isHidden: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.isHidden ? 'Hidden from nav (SEO only)' : 'Shown in navigation'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={saving}
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? (
                <>
                  <Package className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingCategory ? 'Update' : 'Create'} Category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{categoryToDelete?.name}&quot;?
              {categoryToDelete?._count?.Product && categoryToDelete._count.Product > 0 && (
                <span className="block mt-2 text-amber-600">
                  This category has {categoryToDelete._count.Product} product(s). It will be
                  deactivated instead of deleted.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCategoryToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {categoryToDelete?._count?.Product && categoryToDelete._count.Product > 0
                ? 'Deactivate'
                : 'Delete'}{' '}
              Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
