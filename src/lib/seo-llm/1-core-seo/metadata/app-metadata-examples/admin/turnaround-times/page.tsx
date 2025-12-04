'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

import { Plus, Edit, Trash2, Clock, Copy } from 'lucide-react'
import toast from '@/lib/toast'

interface TurnaroundTime {
  id: string
  name: string
  displayName: string
  description?: string
  daysMin: number
  daysMax?: number
  pricingModel: 'FLAT' | 'PERCENTAGE' | 'PER_UNIT' | 'CUSTOM'
  basePrice: number
  priceMultiplier: number
  requiresNoCoating: boolean
  restrictedCoatings: string[]
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface TurnaroundTimeFormData {
  name: string
  displayName: string
  description: string
  daysMin: number
  daysMax: number | null
  pricingModel: 'FLAT' | 'PERCENTAGE' | 'PER_UNIT' | 'CUSTOM'
  basePrice: number
  priceMultiplier: number
  requiresNoCoating: boolean
  restrictedCoatings: string[]
  sortOrder: number
  isActive: boolean
}

const defaultFormData: TurnaroundTimeFormData = {
  name: '',
  displayName: '',
  description: '',
  daysMin: 1,
  daysMax: null,
  pricingModel: 'PERCENTAGE',
  basePrice: 0,
  priceMultiplier: 1.0,
  requiresNoCoating: false,
  restrictedCoatings: [],
  sortOrder: 0,
  isActive: true,
}

export default function TurnaroundTimesPage() {
  const [turnaroundTimes, setTurnaroundTimes] = useState<TurnaroundTime[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TurnaroundTime | null>(null)
  const [formData, setFormData] = useState<TurnaroundTimeFormData>(defaultFormData)

  // Fetch turnaround times
  useEffect(() => {
    fetchTurnaroundTimes()
  }, [])

  const fetchTurnaroundTimes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/turnaround-times')
      if (!response.ok) throw new Error('Failed to fetch turnaround times')
      const data = await response.json()
      setTurnaroundTimes(data)
    } catch (error) {
      toast.error('Failed to load turnaround times')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingItem ? `/api/turnaround-times/${editingItem.id}` : '/api/turnaround-times'
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save turnaround time')
      }

      toast.success(editingItem ? 'Turnaround time updated' : 'Turnaround time created')
      setDialogOpen(false)
      setEditingItem(null)
      setFormData(defaultFormData)
      fetchTurnaroundTimes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save turnaround time')
    }
  }

  const handleEdit = (item: TurnaroundTime) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      displayName: item.displayName,
      description: item.description || '',
      daysMin: item.daysMin,
      daysMax: item.daysMax || null,
      pricingModel: item.pricingModel,
      basePrice: item.basePrice,
      priceMultiplier: item.priceMultiplier,
      requiresNoCoating: item.requiresNoCoating,
      restrictedCoatings: item.restrictedCoatings,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this turnaround time?')) return

    try {
      const response = await fetch(`/api/turnaround-times/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete turnaround time')

      toast.success('Turnaround time deleted')
      fetchTurnaroundTimes()
    } catch (error) {
      toast.error('Failed to delete turnaround time')
    }
  }

  const handleDuplicate = async (item: TurnaroundTime) => {
    try {
      const response = await fetch(`/api/turnaround-times/${item.id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate turnaround time')
      }

      toast.success('Turnaround time duplicated')
      fetchTurnaroundTimes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate turnaround time')
    }
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormData(defaultFormData)
    setDialogOpen(true)
  }

  const formatDaysRange = (daysMin: number, daysMax?: number) => {
    if (daysMin === 0) return 'Same Day'
    if (!daysMax || daysMin === daysMax) return `${daysMin} day${daysMin !== 1 ? 's' : ''}`
    return `${daysMin}-${daysMax} days`
  }

  const getPricingDisplay = (pricingModel: string, basePrice: number, priceMultiplier: number) => {
    switch (pricingModel) {
      case 'FLAT':
        return `+$${basePrice.toFixed(2)}`
      case 'PERCENTAGE':
        return `${(priceMultiplier * 100).toFixed(0)}%`
      case 'PER_UNIT':
        return `+$${basePrice.toFixed(2)}/unit`
      default:
        return 'Custom'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turnaround Times</h1>
          <p className="text-muted-foreground">Manage turnaround time options for products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Turnaround Time
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Turnaround Time' : 'Create Turnaround Time'}
              </DialogTitle>
              <DialogDescription>
                Configure turnaround time options with pricing adjustments
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    required
                    id="name"
                    placeholder="Economy, Fast, etc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    required
                    id="displayName"
                    placeholder="Economy (2-4 Days)"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Standard processing time"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysMin">Minimum Days</Label>
                  <Input
                    required
                    id="daysMin"
                    max="30"
                    min="0"
                    type="number"
                    value={formData.daysMin}
                    onChange={(e) =>
                      setFormData({ ...formData, daysMin: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daysMax">Maximum Days (optional)</Label>
                  <Input
                    id="daysMax"
                    max="30"
                    min="0"
                    type="number"
                    value={formData.daysMax || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daysMax: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricingModel">Pricing Model</Label>
                  <Select
                    value={formData.pricingModel}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        pricingModel: value as 'FLAT' | 'PERCENTAGE' | 'PER_UNIT' | 'CUSTOM',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat Fee</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="PER_UNIT">Per Unit</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, basePrice: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMultiplier">Price Multiplier</Label>
                  <Input
                    id="priceMultiplier"
                    max="10"
                    min="0.1"
                    step="0.01"
                    type="number"
                    value={formData.priceMultiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, priceMultiplier: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.requiresNoCoating}
                      id="requiresNoCoating"
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, requiresNoCoating: checked })
                      }
                    />
                    <Label htmlFor="requiresNoCoating">Requires No Coating</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive}
                      id="isActive"
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingItem ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Special Requirements</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-8" colSpan={6}>
                  Loading turnaround times...
                </TableCell>
              </TableRow>
            ) : turnaroundTimes.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-8 text-muted-foreground" colSpan={6}>
                  No turnaround times found. Create your first one to get started.
                </TableCell>
              </TableRow>
            ) : (
              turnaroundTimes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.displayName}</div>
                      <div className="text-sm text-muted-foreground">{item.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {formatDaysRange(item.daysMin, item.daysMax)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getPricingDisplay(item.pricingModel, item.basePrice, item.priceMultiplier)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.requiresNoCoating && <Badge variant="outline">No Coating Required</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(item)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
