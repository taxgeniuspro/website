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
  Copy,
  Ruler,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Layers,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import toast from '@/lib/toast'

interface SizeGroup {
  id: string
  name: string
  description: string | null
  values: string
  defaultValue: string
  customMinWidth: number | null
  customMaxWidth: number | null
  customMinHeight: number | null
  customMaxHeight: number | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  valuesList?: string[]
  hasCustomOption?: boolean
  _count: {
    products: number
  }
}

export default function SizesPage() {
  const [groups, setGroups] = useState<SizeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<SizeGroup | null>(null)
  const [editingGroup, setEditingGroup] = useState<SizeGroup | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    values: '',
    defaultValue: '',
    customMinWidth: 1,
    customMaxWidth: 96,
    customMinHeight: 1,
    customMaxHeight: 96,
    sortOrder: 0,
    isActive: true,
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sizes')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      toast.error('Failed to fetch size groups')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)

      if (!formData.name || !formData.values || !formData.defaultValue) {
        toast.error('Name, values, and default value are required')
        setSaving(false)
        return
      }

      const url = editingGroup ? `/api/sizes/${editingGroup.id}` : '/api/sizes'

      const method = editingGroup ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingGroup ? 'Group updated successfully' : 'Group created successfully')
        setDialogOpen(false)
        resetForm()
        fetchGroups()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save group')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!groupToDelete) return

    try {
      const response = await fetch(`/api/sizes/${groupToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Group deleted successfully')
        setDeleteDialogOpen(false)
        setGroupToDelete(null)
        fetchGroups()
      } else {
        throw new Error(data.error || 'Failed to delete group')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete group')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      values: '',
      defaultValue: '',
      customMinWidth: 1,
      customMaxWidth: 96,
      customMinHeight: 1,
      customMaxHeight: 96,
      sortOrder: 0,
      isActive: true,
    })
    setEditingGroup(null)
  }

  const openEditDialog = (group: SizeGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
      values: group.values,
      defaultValue: group.defaultValue,
      customMinWidth: group.customMinWidth || 1,
      customMaxWidth: group.customMaxWidth || 96,
      customMinHeight: group.customMinHeight || 1,
      customMaxHeight: group.customMaxHeight || 96,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (group: SizeGroup) => {
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const openDuplicateDialog = (group: SizeGroup) => {
    setEditingGroup(null) // Important: clear editing group so it creates a new item
    setFormData({
      name: `${group.name} - Copy`,
      description: group.description || '',
      values: group.values,
      defaultValue: group.defaultValue,
      customMinWidth: group.customMinWidth || 1,
      customMaxWidth: group.customMaxWidth || 96,
      customMinHeight: group.customMinHeight || 1,
      customMaxHeight: group.customMaxHeight || 96,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    })
    setDialogOpen(true)
  }

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const parseValuesList = (values: string) => {
    return values
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v)
  }

  const hasCustomOption = (values: string) => {
    return values.toLowerCase().includes('custom')
  }

  const formatSizeDisplay = (value: string) => {
    // If it's a dimension format like "4x6", display it nicely
    if (value.includes('x') && !value.toLowerCase().includes('custom')) {
      const [width, height] = value.split('x')
      return `${width}" × ${height}"`
    }
    return value
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Sizes Management
              </CardTitle>
              <CardDescription>Create and manage size options for products</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sizes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading sizes...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sizes found. Create your first size set for products.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <Collapsible
                  key={group.id}
                  open={expandedGroups.has(group.id)}
                  onOpenChange={() => toggleGroupExpansion(group.id)}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CollapsibleTrigger asChild>
                            <Button className="p-1" size="sm" variant="ghost">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              <Badge variant={group.isActive ? 'default' : 'secondary'}>
                                {group.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {group.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {group.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Ruler className="h-4 w-4" />
                              {group.valuesList?.length || 0} sizes
                            </div>
                            {group._count.products > 0 && (
                              <div className="flex items-center gap-1">
                                <Maximize2 className="h-4 w-4" />
                                {group._count.products} products
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDuplicateDialog(group)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(group)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Sizes:</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {group.valuesList?.map((value, index) => (
                                <Badge
                                  key={index}
                                  className="text-sm"
                                  variant={value === group.defaultValue ? 'default' : 'outline'}
                                >
                                  {formatSizeDisplay(value)}
                                  {value === group.defaultValue && (
                                    <span className="ml-1 text-xs">(default)</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {group.hasCustomOption && (
                            <div>
                              <Label className="text-sm font-medium">Custom Size Limits:</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Width:</span>{' '}
                                  {group.customMinWidth || 1}" - {group.customMaxWidth || 96}"
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Height:</span>{' '}
                                  {group.customMinHeight || 1}" - {group.customMaxHeight || 96}"
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingGroup ? 'Edit Sizes' : 'Create New Sizes'}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Configure size options for your products. Enter sizes in a comma-separated format.
              </p>
              <p className="text-sm">
                <span className="font-medium">Examples:</span> "2x3.5" for 2" × 3.5", "8.5x11" for
                8.5" × 11"
              </p>
              <p className="text-sm">
                <span className="font-medium">Tip:</span> Add "custom" to allow users to enter
                custom dimensions
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="w-full"
                    id="name"
                    placeholder="e.g., Business Cards, Posters, Flyers"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    className="w-full min-h-[80px]"
                    id="description"
                    placeholder="Optional description for this size group"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Size Configuration Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Size Configuration
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="values">
                    Sizes <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    className="w-full font-mono text-sm"
                    id="values"
                    placeholder="Enter sizes separated by commas\nExample: 2x3.5, 4x6, 5x7, 8x10, 8.5x11, 11x17, custom"
                    rows={5}
                    value={formData.values}
                    onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each size separated by a comma. Use "x" between width and height (e.g.,
                    "4x6" for 4 inches by 6 inches).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultValue">
                    Default Size <span className="text-red-500">*</span>
                  </Label>
                  {parseValuesList(formData.values).length > 0 ? (
                    <Select
                      value={formData.defaultValue}
                      onValueChange={(value) => setFormData({ ...formData, defaultValue: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select the default size for this group" />
                      </SelectTrigger>
                      <SelectContent>
                        {parseValuesList(formData.values).map((value) => (
                          <SelectItem key={value} value={value}>
                            {formatSizeDisplay(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      disabled
                      className="w-full"
                      placeholder="Enter size values first to select a default"
                      value=""
                    />
                  )}
                </div>
              </div>
            </div>

            {hasCustomOption(formData.values) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Custom Size Limits
                </h3>
                <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Set the minimum and maximum dimensions allowed when users select "custom" size.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Width Limits */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Width Limits (inches)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="customMinWidth">
                            Minimum
                          </Label>
                          <Input
                            className="w-full"
                            id="customMinWidth"
                            placeholder="1"
                            step="0.25"
                            type="number"
                            value={formData.customMinWidth}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customMinWidth: parseFloat(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="customMaxWidth">
                            Maximum
                          </Label>
                          <Input
                            className="w-full"
                            id="customMaxWidth"
                            placeholder="96"
                            step="0.25"
                            type="number"
                            value={formData.customMaxWidth}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customMaxWidth: parseFloat(e.target.value) || 96,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Height Limits */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Height Limits (inches)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="customMinHeight">
                            Minimum
                          </Label>
                          <Input
                            className="w-full"
                            id="customMinHeight"
                            placeholder="1"
                            step="0.25"
                            type="number"
                            value={formData.customMinHeight}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customMinHeight: parseFloat(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="customMaxHeight">
                            Maximum
                          </Label>
                          <Input
                            className="w-full"
                            id="customMaxHeight"
                            placeholder="96"
                            step="0.25"
                            type="number"
                            value={formData.customMaxHeight}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customMaxHeight: parseFloat(e.target.value) || 96,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Example: Width 1"-96" × Height 1"-96" allows for most standard print sizes.
                  </p>
                </div>
              </div>
            )}

            {/* Additional Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Additional Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    className="w-full"
                    id="sortOrder"
                    placeholder="0"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first in lists
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={formData.isActive}
                      id="isActive"
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label className="text-sm font-normal cursor-pointer" htmlFor="isActive">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
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
                  <Ruler className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingGroup ? 'Update' : 'Create'} Sizes
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
            <DialogTitle>Delete Sizes</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"?
              {groupToDelete?._count.products && groupToDelete._count.products > 0 && (
                <span className="block mt-2 text-red-500">
                  Warning: This group is being used by {groupToDelete._count.products} product(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setGroupToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
