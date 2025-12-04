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
  Hash,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Package2,
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

interface QuantityGroup {
  id: string
  name: string
  description: string | null
  values: string
  defaultValue: string
  customMin: number | null
  customMax: number | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  valuesList?: string[]
  hasCustomOption?: boolean
  _count: {
    ProductQuantityGroup: number
  }
}

export default function QuantitiesPage() {
  const [groups, setGroups] = useState<QuantityGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<QuantityGroup | null>(null)
  const [editingGroup, setEditingGroup] = useState<QuantityGroup | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    values: '',
    defaultValue: '',
    customMin: 1,
    customMax: 100000,
    sortOrder: 0,
    isActive: true,
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/quantities')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()

      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : []

      // Process groups to add derived properties
      const processedGroups = dataArray.map((group: QuantityGroup) => ({
        ...group,
        valuesList: parseValuesList(group.values || ''),
        hasCustomOption: hasCustomOption(group.values || ''),
      }))

      setGroups(processedGroups)
    } catch (error) {
      toast.error('Failed to fetch quantity groups')
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

      const url = editingGroup ? `/api/quantities/${editingGroup.id}` : '/api/quantities'

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
      const response = await fetch(`/api/quantities/${groupToDelete.id}`, {
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
      customMin: 1,
      customMax: 100000,
      sortOrder: 0,
      isActive: true,
    })
    setEditingGroup(null)
  }

  const openEditDialog = (group: QuantityGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
      values: group.values,
      defaultValue: group.defaultValue,
      customMin: group.customMin || 1,
      customMax: group.customMax || 100000,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (group: QuantityGroup) => {
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const openDuplicateDialog = (group: QuantityGroup) => {
    setEditingGroup(null) // Important: clear editing group so it creates a new item
    setFormData({
      name: `${group.name} - Copy`,
      description: group.description || '',
      values: group.values,
      defaultValue: group.defaultValue,
      customMin: group.customMin || 1,
      customMax: group.customMax || 100000,
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
    if (!values) return []
    return values
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v)
  }

  const hasCustomOption = (values: string) => {
    if (!values) return false
    return values.toLowerCase().includes('custom')
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Quantities Management
              </CardTitle>
              <CardDescription>Create and manage quantity options for products</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Quantities
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading quantities...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quantities found. Create your first quantity set for products.
            </div>
          ) : (
            <div className="space-y-4">
              {(groups || []).map((group) => (
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
                              <Hash className="h-4 w-4" />
                              {(group.valuesList && group.valuesList.length) || 0} values
                            </div>
                            {group._count.ProductQuantityGroup > 0 && (
                              <div className="flex items-center gap-1">
                                <Package2 className="h-4 w-4" />
                                {group._count.ProductQuantityGroup} products
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
                            <Label className="text-sm font-medium">Values:</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(group.valuesList || []).map((value, index) => (
                                <Badge
                                  key={index}
                                  className="text-sm"
                                  variant={value === group.defaultValue ? 'default' : 'outline'}
                                >
                                  {value}
                                  {value === group.defaultValue && (
                                    <span className="ml-1 text-xs">(default)</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {group.hasCustomOption && (group.customMin || group.customMax) && (
                            <div>
                              <Label className="text-sm font-medium">Custom Range:</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Min: {group.customMin?.toLocaleString() || 'No limit'} - Max:{' '}
                                {group.customMax?.toLocaleString() || 'No limit'}
                              </p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Quantities' : 'Create New Quantities'}</DialogTitle>
            <DialogDescription>
              Enter comma-separated values. Include "custom" to allow user input.
            </DialogDescription>
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
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="values">
                Values
              </Label>
              <Textarea
                className="col-span-3"
                id="values"
                placeholder="e.g., 25,50,100,250,500,1000,custom"
                rows={2}
                value={formData.values}
                onChange={(e) => setFormData({ ...formData, values: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="defaultValue">
                Default Value
              </Label>
              {parseValuesList(formData.values).length > 0 ? (
                <Select
                  value={formData.defaultValue}
                  onValueChange={(value) => setFormData({ ...formData, defaultValue: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select default value" />
                  </SelectTrigger>
                  <SelectContent>
                    {parseValuesList(formData.values).map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled
                  className="col-span-3"
                  placeholder="Enter values first to select a default"
                  value=""
                />
              )}
            </div>

            {hasCustomOption(formData.values) && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="customMin">
                    Custom Min
                  </Label>
                  <Input
                    className="col-span-3"
                    id="customMin"
                    placeholder="Minimum value for custom input"
                    type="number"
                    value={formData.customMin}
                    onChange={(e) =>
                      setFormData({ ...formData, customMin: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="customMax">
                    Custom Max
                  </Label>
                  <Input
                    className="col-span-3"
                    id="customMax"
                    placeholder="Maximum value for custom input"
                    type="number"
                    value={formData.customMax}
                    onChange={(e) =>
                      setFormData({ ...formData, customMax: parseInt(e.target.value) || 100000 })
                    }
                  />
                </div>
              </>
            )}

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
                  <Hash className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingGroup ? 'Update' : 'Create'} Quantities
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
            <DialogTitle>Delete Quantities</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"?
              {groupToDelete?._count.ProductQuantityGroup &&
                groupToDelete._count.ProductQuantityGroup > 0 && (
                  <span className="block mt-2 text-red-500">
                    Warning: This group is being used by {groupToDelete._count.ProductQuantityGroup}{' '}
                    product(s).
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
