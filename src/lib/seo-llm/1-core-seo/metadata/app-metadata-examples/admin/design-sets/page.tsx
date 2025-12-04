'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Search, Save, Palette, ChevronDown, ChevronRight } from 'lucide-react'
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
import toast from '@/lib/toast'

interface DesignOption {
  id: string
  name: string
  code: string
  pricingType: string
  isActive: boolean
}

interface DesignSetItem {
  id: string
  designOptionId: string
  isDefault: boolean
  sortOrder: number
  designOption: DesignOption
}

interface DesignSet {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  designOptionItems?: DesignSetItem[]
  productDesignSets?: any[]
}

export default function DesignSetsPage() {
  const [sets, setSets] = useState<DesignSet[]>([])
  const [options, setOptions] = useState<DesignOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [setToDelete, setSetToDelete] = useState<DesignSet | null>(null)
  const [editingSet, setEditingSet] = useState<DesignSet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedSet, setExpandedSet] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  })
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: string]: {
      isDefault: boolean
      sortOrder: number
    }
  }>({})

  useEffect(() => {
    fetchSets()
    fetchOptions()
  }, [])

  const fetchSets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/design-sets')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setSets(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch design sets')
      setSets([])
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const response = await fetch('/api/design-options')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setOptions(Array.isArray(data) ? data.filter((opt: DesignOption) => opt.isActive) : [])
    } catch (error) {
      toast.error('Failed to fetch design options')
      setOptions([])
    }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)

      const designOptions = Object.entries(selectedOptions).map(([id, config], index) => ({
        id,
        isDefault: config.isDefault,
        sortOrder: config.sortOrder || index,
      }))

      const url = editingSet ? `/api/design-sets/${editingSet.id}` : '/api/design-sets'
      const method = editingSet ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          designOptions: designOptions.length > 0 ? designOptions : undefined,
        }),
      })

      if (response.ok) {
        toast.success(
          editingSet ? 'Design set updated successfully' : 'Design set created successfully'
        )
        setDialogOpen(false)
        resetForm()
        fetchSets()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save design set')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save design set')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!setToDelete) return

    try {
      const response = await fetch(`/api/design-sets/${setToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Design set deleted successfully')
        setDeleteDialogOpen(false)
        setSetToDelete(null)
        fetchSets()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete design set')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete design set')
    }
  }

  const handleToggleActive = async (set: DesignSet) => {
    try {
      const response = await fetch(`/api/design-sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !set.isActive }),
      })

      if (response.ok) {
        toast.success(`Design set ${!set.isActive ? 'activated' : 'deactivated'} successfully`)
        fetchSets()
      } else {
        throw new Error('Failed to update design set status')
      }
    } catch (error) {
      toast.error('Failed to update design set status')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sortOrder: 0,
      isActive: true,
    })
    setSelectedOptions({})
    setEditingSet(null)
  }

  const handleToggleOption = (optionId: string) => {
    setSelectedOptions((prev) => {
      const newSelected = { ...prev }
      if (newSelected[optionId]) {
        delete newSelected[optionId]
      } else {
        newSelected[optionId] = {
          isDefault: false,
          sortOrder: Object.keys(newSelected).length,
        }
      }
      return newSelected
    })
  }

  const handleOptionConfigChange = (
    optionId: string,
    field: 'isDefault' | 'sortOrder',
    value: boolean | number
  ) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: {
        ...prev[optionId],
        [field]: value,
      },
    }))
  }

  const openEditDialog = (set: DesignSet) => {
    setEditingSet(set)
    setFormData({
      name: set.name,
      description: set.description || '',
      sortOrder: set.sortOrder,
      isActive: set.isActive,
    })

    // Populate selected options
    const selectedData: typeof selectedOptions = {}
    if (set.designOptionItems) {
      set.designOptionItems.forEach((item) => {
        selectedData[item.designOptionId] = {
          isDefault: item.isDefault,
          sortOrder: item.sortOrder,
        }
      })
    }
    setSelectedOptions(selectedData)
    setDialogOpen(true)
  }

  const openDeleteDialog = (set: DesignSet) => {
    setSetToDelete(set)
    setDeleteDialogOpen(true)
  }

  const filteredSets = Array.isArray(sets)
    ? sets.filter(
        (set) =>
          set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          set.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Design Sets Management</CardTitle>
              <CardDescription>Manage collections of design options for products</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Design Set
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              className="max-w-sm"
              placeholder="Search design sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading design sets...</div>
          ) : filteredSets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'No design sets found matching your search.'
                : 'No design sets found. Create your first design set to get started.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSets.map((set) => (
                <div key={set.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                      >
                        {expandedSet === set.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="font-semibold">{set.name}</div>
                        {set.description && (
                          <div className="text-sm text-muted-foreground">{set.description}</div>
                        )}
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {set.designOptionItems?.length || 0} options
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {set.productDesignSets?.length || 0} products
                          </span>
                          {set.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        aria-label={`Toggle ${set.name} active state`}
                        checked={set.isActive}
                        onCheckedChange={() => handleToggleActive(set)}
                      />
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(set)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDeleteDialog(set)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedSet === set.id && set.designOptionItems && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm mb-2">Design Options</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {set.designOptionItems.map((item) => (
                          <div key={item.id} className="p-2 bg-muted rounded text-sm">
                            <div className="font-medium">{item.designOption?.name}</div>
                            <div className="flex gap-2 mt-1">
                              <Badge className="text-xs" variant="outline">
                                {item.designOption?.pricingType}
                              </Badge>
                              {item.isDefault && (
                                <Badge className="text-xs" variant="default">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit Design Set' : 'Create New Design Set'}</DialogTitle>
            <DialogDescription>Configure design option collection for products</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="name">
                Name
              </Label>
              <Input
                className="col-span-3"
                id="name"
                placeholder="e.g., Standard Design Set"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="description">
                Description
              </Label>
              <Textarea
                className="col-span-3"
                id="description"
                placeholder="Brief description of the design set"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
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
              <Label className="text-right" htmlFor="isActive">
                Active
              </Label>
              <div className="col-span-3">
                <Switch
                  checked={formData.isActive}
                  id="isActive"
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <div className="col-span-4 border-t pt-4">
              <Label className="text-base font-semibold mb-2 block">Design Options</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select design options to include in this set
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto border rounded p-4">
                {options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-4 p-3 border rounded">
                    <Checkbox
                      checked={!!selectedOptions[option.id]}
                      onCheckedChange={() => handleToggleOption(option.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Code: {option.code} | {option.pricingType}
                      </div>
                    </div>

                    {selectedOptions[option.id] && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            checked={selectedOptions[option.id].isDefault}
                            onCheckedChange={(checked) =>
                              handleOptionConfigChange(option.id, 'isDefault', checked as boolean)
                            }
                          />
                          <Label className="text-xs">Default</Label>
                        </div>
                        <Input
                          className="w-16"
                          min="0"
                          placeholder="Order"
                          type="number"
                          value={selectedOptions[option.id].sortOrder}
                          onChange={(e) =>
                            handleOptionConfigChange(
                              option.id,
                              'sortOrder',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
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
                  <Palette className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingSet ? 'Update' : 'Create'} Design Set
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
            <DialogTitle>Delete Design Set</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{setToDelete?.name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setSetToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Design Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
