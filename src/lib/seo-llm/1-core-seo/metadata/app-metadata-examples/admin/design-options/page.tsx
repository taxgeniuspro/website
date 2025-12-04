'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Search, Save, Palette } from 'lucide-react'
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

interface DesignOption {
  id: string
  name: string
  code: string
  description: string | null
  tooltipText: string | null
  pricingType: 'FREE' | 'FLAT' | 'SIDE_BASED'
  requiresSideSelection: boolean
  sideOnePrice: number | null
  sideTwoPrice: number | null
  basePrice: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const pricingTypeLabels = {
  FREE: 'Free',
  FLAT: 'Flat Fee',
  SIDE_BASED: 'Side-Based Pricing',
}

export default function DesignOptionsPage() {
  const [options, setOptions] = useState<DesignOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [optionToDelete, setOptionToDelete] = useState<DesignOption | null>(null)
  const [editingOption, setEditingOption] = useState<DesignOption | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    tooltipText: '',
    pricingType: 'FLAT' as DesignOption['pricingType'],
    requiresSideSelection: false,
    sideOnePrice: 0,
    sideTwoPrice: 0,
    basePrice: 0,
    sortOrder: 0,
    isActive: true,
  })

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/design-options')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setOptions(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch design options')
      setOptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)

      const url = editingOption ? `/api/design-options/${editingOption.id}` : '/api/design-options'
      const method = editingOption ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          description: formData.description || null,
          tooltipText: formData.tooltipText || null,
          pricingType: formData.pricingType,
          requiresSideSelection: formData.requiresSideSelection,
          sideOnePrice: formData.pricingType === 'SIDE_BASED' ? formData.sideOnePrice : null,
          sideTwoPrice: formData.pricingType === 'SIDE_BASED' ? formData.sideTwoPrice : null,
          basePrice: formData.pricingType === 'FLAT' ? formData.basePrice : 0,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        }),
      })

      if (response.ok) {
        toast.success(
          editingOption
            ? 'Design option updated successfully'
            : 'Design option created successfully'
        )
        setDialogOpen(false)
        resetForm()
        fetchOptions()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save design option')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save design option')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!optionToDelete) return

    try {
      const response = await fetch(`/api/design-options/${optionToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Design option deleted successfully')
        setDeleteDialogOpen(false)
        setOptionToDelete(null)
        fetchOptions()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete design option')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete design option')
    }
  }

  const handleToggleActive = async (option: DesignOption) => {
    try {
      const response = await fetch(`/api/design-options/${option.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !option.isActive }),
      })

      if (response.ok) {
        toast.success(
          `Design option ${!option.isActive ? 'activated' : 'deactivated'} successfully`
        )
        fetchOptions()
      } else {
        throw new Error('Failed to update design option status')
      }
    } catch (error) {
      toast.error('Failed to update design option status')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      tooltipText: '',
      pricingType: 'FLAT',
      requiresSideSelection: false,
      sideOnePrice: 0,
      sideTwoPrice: 0,
      basePrice: 0,
      sortOrder: 0,
      isActive: true,
    })
    setEditingOption(null)
  }

  const openEditDialog = (option: DesignOption) => {
    setEditingOption(option)
    setFormData({
      name: option.name,
      code: option.code,
      description: option.description || '',
      tooltipText: option.tooltipText || '',
      pricingType: option.pricingType,
      requiresSideSelection: option.requiresSideSelection,
      sideOnePrice: option.sideOnePrice || 0,
      sideTwoPrice: option.sideTwoPrice || 0,
      basePrice: option.basePrice,
      sortOrder: option.sortOrder,
      isActive: option.isActive,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (option: DesignOption) => {
    setOptionToDelete(option)
    setDeleteDialogOpen(true)
  }

  const filteredOptions = Array.isArray(options)
    ? options.filter(
        (option) =>
          option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const formatPriceDisplay = (option: DesignOption) => {
    switch (option.pricingType) {
      case 'FREE':
        return 'Free'
      case 'FLAT':
        return `$${option.basePrice.toFixed(2)}`
      case 'SIDE_BASED':
        return `One: $${option.sideOnePrice?.toFixed(2) || '0.00'} | Two: $${option.sideTwoPrice?.toFixed(2) || '0.00'}`
      default:
        return '-'
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Design Options Management</CardTitle>
              <CardDescription>Manage design service options and pricing</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Design Option
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              className="max-w-sm"
              placeholder="Search design options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Loading design options...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'No design options found matching your search.'
                : 'No design options found. Create your first design option to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Code</TableHead>
                    <TableHead>Pricing Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOptions.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Code: <span className="font-mono">{option.code}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pricingTypeLabels[option.pricingType]}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatPriceDisplay(option)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{option.sortOrder}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <Switch
                            aria-label={`Toggle ${option.name} active state`}
                            checked={option.isActive}
                            onCheckedChange={() => handleToggleActive(option)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(option)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(option)}
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Edit Design Option' : 'Create New Design Option'}
            </DialogTitle>
            <DialogDescription>Configure the design service option and pricing</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="name">
                Name
              </Label>
              <Input
                className="col-span-3"
                id="name"
                placeholder="e.g., Upload Your Own Artwork"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="code">
                Code
              </Label>
              <Input
                className="col-span-3 font-mono"
                id="code"
                placeholder="e.g., upload_own"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="description">
                Description
              </Label>
              <Textarea
                className="col-span-3"
                id="description"
                placeholder="Brief description of the design option"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="tooltipText">
                Tooltip
              </Label>
              <Textarea
                className="col-span-3"
                id="tooltipText"
                placeholder="Help text shown to customers"
                value={formData.tooltipText}
                onChange={(e) => setFormData({ ...formData, tooltipText: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="pricingType">
                Pricing Type
              </Label>
              <Select
                value={formData.pricingType}
                onValueChange={(value) =>
                  setFormData({ ...formData, pricingType: value as DesignOption['pricingType'] })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="FLAT">Flat Fee</SelectItem>
                  <SelectItem value="SIDE_BASED">Side-Based Pricing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.pricingType === 'FLAT' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="basePrice">
                  Base Price ($)
                </Label>
                <Input
                  className="col-span-3"
                  id="basePrice"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            )}

            {formData.pricingType === 'SIDE_BASED' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="sideOnePrice">
                    One Side Price ($)
                  </Label>
                  <Input
                    className="col-span-3"
                    id="sideOnePrice"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={formData.sideOnePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sideOnePrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="sideTwoPrice">
                    Two Sides Price ($)
                  </Label>
                  <Input
                    className="col-span-3"
                    id="sideTwoPrice"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={formData.sideTwoPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sideTwoPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="requiresSideSelection">
                    Requires Side Selection
                  </Label>
                  <div className="col-span-3">
                    <Switch
                      checked={formData.requiresSideSelection}
                      id="requiresSideSelection"
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requiresSideSelection: checked })
                      }
                    />
                  </div>
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
                  <Palette className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingOption ? 'Update' : 'Create'} Design Option
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
            <DialogTitle>Delete Design Option</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{optionToDelete?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setOptionToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Design Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
