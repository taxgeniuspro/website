'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Palette, Square, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CoatingCreationModal } from '@/components/admin/coating-creation-modal'
import { SidesCreationModal } from '@/components/admin/sides-creation-modal'
import toast from '@/lib/toast'

interface CoatingOption {
  id: string
  name: string
  description: string | null
}

interface SidesOption {
  id: string
  name: string
  code: string
  description: string | null
}

interface PaperStockSidesRelation {
  sidesOptionId: string
  priceMultiplier: number
  isEnabled: boolean
  isDefault: boolean
}

interface PaperStockCoatingRelation {
  coatingId: string
  isDefault: boolean
}

interface PaperStock {
  id: string
  name: string
  weight: number
  pricePerSqInch: number
  tooltipText: string | null
  isActive: boolean
  // Vendor pricing & markup fields
  vendorPricePerSqInch?: number | null
  markupType?: 'PERCENTAGE' | 'FLAT' | null
  markupValue?: number | null
  profitMargin?: number | null
  paperStockCoatings: (PaperStockCoatingRelation & { coating: CoatingOption })[]
  paperStockSides: (PaperStockSidesRelation & { sidesOption: SidesOption })[]
  productsCount?: number
}

export default function PaperStocksPage() {
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null)
  const [deletingStock, setDeletingStock] = useState<PaperStock | null>(null)
  const [allCoatingOptions, setAllCoatingOptions] = useState<CoatingOption[]>([])
  const [allSidesOptions, setAllSidesOptions] = useState<SidesOption[]>([])
  const [coatingModalOpen, setCoatingModalOpen] = useState(false)
  const [sidesModalOpen, setSidesModalOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    weight: 0,
    pricePerSqInch: 0,
    tooltipText: '',
    isActive: true,
    // Vendor pricing & markup fields
    vendorPricePerSqInch: 0,
    markupType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    markupValue: 0,
    selectedCoatings: [] as string[],
    defaultCoating: '' as string,
    selectedSides: [] as string[],
    defaultSides: '' as string,
    sidesMultipliers: {} as Record<string, number>,
  })

  useEffect(() => {
    fetchPaperStocks()
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const [coatingsRes, sidesRes] = await Promise.all([
        fetch('/api/coating-options'),
        fetch('/api/sides-options'),
      ])

      if (coatingsRes.ok) {
        const coatingsData = await coatingsRes.json()
        setAllCoatingOptions(coatingsData)
      }

      if (sidesRes.ok) {
        const sidesData = await sidesRes.json()
        setAllSidesOptions(sidesData)
      }
    } catch (error) {}
  }

  const fetchPaperStocks = async () => {
    try {
      const response = await fetch('/api/paper-stocks')
      if (!response.ok) throw new Error('Failed to fetch paper stocks')

      const data = await response.json()

      // Transform API response to match our interface
      const transformedStocks = data.map((stock: any) => ({
        id: stock.id,
        name: stock.name,
        weight: stock.weight || 0.0015,
        pricePerSqInch: stock.pricePerSqInch || 0.0015,
        tooltipText: stock.tooltipText,
        isActive: stock.isActive,
        // Vendor pricing & markup fields
        vendorPricePerSqInch: stock.vendorPricePerSqInch,
        markupType: stock.markupType,
        markupValue: stock.markupValue,
        profitMargin: stock.profitMargin,
        paperStockCoatings: stock.paperStockCoatings || [],
        paperStockSides: stock.paperStockSides || [],
        productsCount: stock.paperStockSetItems?.length || 0,
      }))

      setPaperStocks(transformedStocks)
    } catch (error) {
      toast.error('Failed to load paper stocks')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingStock ? `/api/paper-stocks/${editingStock.id}` : '/api/paper-stocks'
      const method = editingStock ? 'PUT' : 'POST'

      const payload = {
        name: formData.name,
        weight: formData.weight,
        pricePerSqInch: formData.pricePerSqInch,
        tooltipText: formData.tooltipText,
        isActive: formData.isActive,
        // Vendor pricing & markup fields
        vendorPricePerSqInch: formData.vendorPricePerSqInch || null,
        markupType: formData.markupType,
        markupValue: formData.markupValue,
        coatings: formData.selectedCoatings.map((coatingId) => ({
          id: coatingId,
          isDefault: coatingId === formData.defaultCoating,
        })),
        sidesOptions: formData.selectedSides.map((sidesId) => ({
          id: sidesId,
          multiplier: formData.sidesMultipliers[sidesId] || 1.0,
          isDefault: sidesId === formData.defaultSides,
        })),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save paper stock')
      }

      toast.success(editingStock ? 'Paper stock updated' : 'Paper stock created')
      setDialogOpen(false)
      resetForm()
      fetchPaperStocks()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (stock: PaperStock) => {
    setEditingStock(stock)

    // Extract coating data
    const selectedCoatings = stock.paperStockCoatings.map((pc) => pc.coatingId)
    const defaultCoating = stock.paperStockCoatings.find((pc) => pc.isDefault)?.coatingId || ''

    // Extract sides data and multipliers
    const selectedSides = stock.paperStockSides.map((ps) => ps.sidesOptionId)
    const defaultSides = stock.paperStockSides.find((ps) => ps.isDefault)?.sidesOptionId || ''
    const sidesMultipliers = stock.paperStockSides.reduce(
      (acc, ps) => {
        acc[ps.sidesOptionId] = ps.priceMultiplier
        return acc
      },
      {} as Record<string, number>
    )

    setFormData({
      name: stock.name,
      weight: stock.weight,
      pricePerSqInch: stock.pricePerSqInch,
      tooltipText: stock.tooltipText || '',
      isActive: stock.isActive,
      // Vendor pricing & markup fields
      vendorPricePerSqInch: stock.vendorPricePerSqInch || 0,
      markupType: stock.markupType || 'PERCENTAGE',
      markupValue: stock.markupValue || 0,
      selectedCoatings,
      defaultCoating,
      selectedSides,
      defaultSides,
      sidesMultipliers,
    })
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingStock) return

    try {
      const response = await fetch(`/api/paper-stocks/${deletingStock.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete paper stock')
      }

      toast.success('Paper stock deleted')
      setDeleteDialogOpen(false)
      setDeletingStock(null)
      fetchPaperStocks()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const resetForm = () => {
    setEditingStock(null)
    setFormData({
      name: '',
      weight: 0,
      pricePerSqInch: 0,
      tooltipText: '',
      isActive: true,
      // Vendor pricing & markup fields
      vendorPricePerSqInch: 0,
      markupType: 'PERCENTAGE',
      markupValue: 0,
      selectedCoatings: [],
      defaultCoating: '',
      selectedSides: [],
      defaultSides: '',
      sidesMultipliers: {},
    })
  }

  const openDeleteDialog = (stock: PaperStock) => {
    setDeletingStock(stock)
    setDeleteDialogOpen(true)
  }

  const handleDuplicate = (stock: PaperStock) => {
    setEditingStock(null) // Important: clear editing stock so it creates a new item
    // Extract coating data
    const selectedCoatings = stock.paperStockCoatings.map((pc) => pc.coatingId)
    const defaultCoating = stock.paperStockCoatings.find((pc) => pc.isDefault)?.coatingId || ''

    // Extract sides data and multipliers
    const selectedSides = stock.paperStockSides.map((ps) => ps.sidesOptionId)
    const defaultSides = stock.paperStockSides.find((ps) => ps.isDefault)?.sidesOptionId || ''
    const sidesMultipliers = stock.paperStockSides.reduce(
      (acc, ps) => {
        acc[ps.sidesOptionId] = ps.priceMultiplier
        return acc
      },
      {} as Record<string, number>
    )

    setFormData({
      name: `${stock.name} - Copy`,
      weight: stock.weight,
      pricePerSqInch: stock.pricePerSqInch,
      tooltipText: stock.tooltipText || '',
      isActive: stock.isActive,
      // Vendor pricing & markup fields
      vendorPricePerSqInch: stock.vendorPricePerSqInch || 0,
      markupType: stock.markupType || 'PERCENTAGE',
      markupValue: stock.markupValue || 0,
      selectedCoatings,
      defaultCoating,
      selectedSides,
      defaultSides,
      sidesMultipliers,
    })
    setDialogOpen(true)
  }

  const handleCoatingCreated = (newCoating: CoatingOption) => {
    // Add to the list of available coating options
    setAllCoatingOptions((prev) => [...prev, newCoating])

    // Auto-select the new coating and set as default if it's the first one
    setFormData((prev) => ({
      ...prev,
      selectedCoatings: [...prev.selectedCoatings, newCoating.id],
      defaultCoating: prev.selectedCoatings.length === 0 ? newCoating.id : prev.defaultCoating,
    }))
  }

  const handleSidesCreated = (newSides: SidesOption) => {
    // Add to the list of available sides options
    setAllSidesOptions((prev) => [...prev, newSides])

    // Auto-select the new sides option with default multiplier and set as default if first one
    setFormData((prev) => ({
      ...prev,
      selectedSides: [...prev.selectedSides, newSides.id],
      defaultSides: prev.selectedSides.length === 0 ? newSides.id : prev.defaultSides,
      sidesMultipliers: {
        ...prev.sidesMultipliers,
        [newSides.id]: 1.0,
      },
    }))
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paper Stocks</h1>
        <p className="text-gray-600 mt-2">Manage paper stocks with coating and side options</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Paper Stock Management</CardTitle>
              <CardDescription>
                Create and manage paper stocks with available coating and side options
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Paper Stock
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingStock ? 'Edit Paper Stock' : 'Create Paper Stock'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingStock
                        ? 'Update the paper stock details and options'
                        : 'Add a new paper stock with coating and side options'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Basic Information</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            required
                            id="name"
                            placeholder="e.g., 16pt C2S Cardstock"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight">Weight (for shipping) *</Label>
                          <Input
                            required
                            id="weight"
                            min="0"
                            placeholder="0.0000002"
                            step="0.0000001"
                            type="number"
                            value={formData.weight}
                            onChange={(e) =>
                              setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Numeric weight used for shipping rate calculations (supports up to 7
                            decimal places)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pricePerSqInch">Price per Square Inch ($)</Label>
                          <Input
                            id="pricePerSqInch"
                            min="0"
                            step="0.0000001"
                            type="number"
                            value={formData.pricePerSqInch}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                pricePerSqInch: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Supports up to 7 decimal places for precise pricing
                          </p>
                        </div>
                      </div>

                      {/* Vendor Pricing & Markup Section */}
                      <div className="border-t pt-4 space-y-4">
                        <h4 className="font-semibold text-sm text-gray-700">
                          Vendor Pricing & Markup (Optional)
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="vendorPricePerSqInch">
                            Vendor Price per Square Inch ($)
                          </Label>
                          <Input
                            id="vendorPricePerSqInch"
                            min="0"
                            step="0.0000001"
                            type="number"
                            value={formData.vendorPricePerSqInch}
                            onChange={(e) => {
                              const vendorPrice = parseFloat(e.target.value) || 0
                              setFormData({ ...formData, vendorPricePerSqInch: vendorPrice })
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            The base price from your vendor before markup
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="markupType">Markup Type</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              id="markupType"
                              value={formData.markupType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  markupType: e.target.value as 'PERCENTAGE' | 'FLAT',
                                })
                              }
                            >
                              <option value="PERCENTAGE">Percentage (%)</option>
                              <option value="FLAT">Flat Amount ($)</option>
                            </select>
                            <p className="text-xs text-muted-foreground">How to calculate markup</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="markupValue">
                              Markup Value {formData.markupType === 'PERCENTAGE' ? '(%)' : '($)'}
                            </Label>
                            <Input
                              id="markupValue"
                              min="0"
                              step={formData.markupType === 'PERCENTAGE' ? '1' : '0.01'}
                              type="number"
                              value={formData.markupValue}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  markupValue: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              {formData.markupType === 'PERCENTAGE'
                                ? 'e.g., 100 for 100% markup (doubles price)'
                                : 'e.g., 1.00 to add $1.00 per sq inch'}
                            </p>
                          </div>
                        </div>
                        {formData.vendorPricePerSqInch > 0 && formData.markupValue > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-900">
                              Price Calculation Preview:
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Vendor Price: ${formData.vendorPricePerSqInch.toFixed(7)} →{' '}
                              {formData.markupType === 'PERCENTAGE'
                                ? `+ ${formData.markupValue}% = $${(
                                    formData.vendorPricePerSqInch *
                                    (1 + formData.markupValue / 100)
                                  ).toFixed(7)}`
                                : `+ $${formData.markupValue.toFixed(7)} = $${(
                                    formData.vendorPricePerSqInch + formData.markupValue
                                  ).toFixed(7)}`}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Profit Margin: $
                              {formData.markupType === 'PERCENTAGE'
                                ? (
                                    formData.vendorPricePerSqInch *
                                    (formData.markupValue / 100)
                                  ).toFixed(7)
                                : formData.markupValue.toFixed(7)}{' '}
                              per square inch
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tooltipText">Description</Label>
                        <Textarea
                          id="tooltipText"
                          placeholder="Optional description for this paper stock"
                          rows={3}
                          value={formData.tooltipText}
                          onChange={(e) =>
                            setFormData({ ...formData, tooltipText: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.isActive}
                          id="isActive"
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>

                    {/* Coating Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Palette className="h-5 w-5" />
                          Available Coating Options
                        </h3>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setCoatingModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Custom
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {allCoatingOptions.map((coating) => (
                          <div key={coating.id} className="border rounded-lg p-3">
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                checked={formData.selectedCoatings.includes(coating.id)}
                                id={`coating-${coating.id}`}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      selectedCoatings: [...formData.selectedCoatings, coating.id],
                                      // Set as default if it's the first coating selected
                                      defaultCoating:
                                        formData.selectedCoatings.length === 0
                                          ? coating.id
                                          : formData.defaultCoating,
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedCoatings: formData.selectedCoatings.filter(
                                        (id) => id !== coating.id
                                      ),
                                      // Clear default if this was the default coating
                                      defaultCoating:
                                        formData.defaultCoating === coating.id
                                          ? ''
                                          : formData.defaultCoating,
                                    })
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium" htmlFor={`coating-${coating.id}`}>
                                    {coating.name}
                                  </Label>
                                  {formData.defaultCoating === coating.id && (
                                    <Badge className="text-xs" variant="secondary">
                                      DEFAULT
                                    </Badge>
                                  )}
                                </div>
                                {coating.description && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {coating.description}
                                  </div>
                                )}
                                {formData.selectedCoatings.includes(coating.id) && (
                                  <div className="mt-2">
                                    <label className="flex items-center space-x-2 text-sm">
                                      <input
                                        checked={formData.defaultCoating === coating.id}
                                        className="w-4 h-4"
                                        name="defaultCoating"
                                        type="radio"
                                        onChange={() =>
                                          setFormData({ ...formData, defaultCoating: coating.id })
                                        }
                                      />
                                      <span>Set as default coating</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Side Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Square className="h-5 w-5" />
                          Available Side Options
                        </h3>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setSidesModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Custom
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {allSidesOptions.map((sides) => (
                          <div key={sides.id} className="border rounded-lg p-3">
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                checked={formData.selectedSides.includes(sides.id)}
                                id={`sides-${sides.id}`}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      selectedSides: [...formData.selectedSides, sides.id],
                                      // Set as default if it's the first sides selected
                                      defaultSides:
                                        formData.selectedSides.length === 0
                                          ? sides.id
                                          : formData.defaultSides,
                                      // Set default multiplier if not already set
                                      sidesMultipliers: {
                                        ...formData.sidesMultipliers,
                                        [sides.id]: formData.sidesMultipliers[sides.id] || 1.0,
                                      },
                                    })
                                  } else {
                                    const { [sides.id]: removed, ...remainingMultipliers } =
                                      formData.sidesMultipliers
                                    setFormData({
                                      ...formData,
                                      selectedSides: formData.selectedSides.filter(
                                        (id) => id !== sides.id
                                      ),
                                      // Clear default if this was the default sides
                                      defaultSides:
                                        formData.defaultSides === sides.id
                                          ? ''
                                          : formData.defaultSides,
                                      sidesMultipliers: remainingMultipliers,
                                    })
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium" htmlFor={`sides-${sides.id}`}>
                                    {sides.name}
                                  </Label>
                                  {formData.defaultSides === sides.id && (
                                    <Badge className="text-xs" variant="secondary">
                                      DEFAULT
                                    </Badge>
                                  )}
                                  {formData.selectedSides.includes(sides.id) && (
                                    <Badge className="text-xs" variant="outline">
                                      {(formData.sidesMultipliers[sides.id] || 1.0).toFixed(1)}x
                                    </Badge>
                                  )}
                                </div>
                                {sides.description && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {sides.description}
                                  </div>
                                )}
                                {formData.selectedSides.includes(sides.id) && (
                                  <div className="mt-2 space-y-2">
                                    <div>
                                      <Label className="text-sm" htmlFor={`multiplier-${sides.id}`}>
                                        Price Multiplier:
                                      </Label>
                                      <Input
                                        className="w-24 h-8 text-sm mt-1"
                                        id={`multiplier-${sides.id}`}
                                        max="10"
                                        min="0.1"
                                        step="0.1"
                                        type="number"
                                        value={formData.sidesMultipliers[sides.id] || 1.0}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 1.0
                                          setFormData({
                                            ...formData,
                                            sidesMultipliers: {
                                              ...formData.sidesMultipliers,
                                              [sides.id]: value,
                                            },
                                          })
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="flex items-center space-x-2 text-sm">
                                        <input
                                          checked={formData.defaultSides === sides.id}
                                          className="w-4 h-4"
                                          name="defaultSides"
                                          type="radio"
                                          onChange={() =>
                                            setFormData({ ...formData, defaultSides: sides.id })
                                          }
                                        />
                                        <span>Set as default sides option</span>
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingStock ? 'Update' : 'Create'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {paperStocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No paper stocks created yet. Click "Add Paper Stock" to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight (shipping)</TableHead>
                  <TableHead className="text-center">Price/sq in</TableHead>
                  <TableHead className="text-center">Markup</TableHead>
                  <TableHead className="text-center">Coatings</TableHead>
                  <TableHead className="text-center">Sides</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paperStocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{stock.name}</div>
                        {stock.tooltipText && (
                          <div className="text-sm text-gray-500">{stock.tooltipText}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{stock.weight.toFixed(7)}</TableCell>
                    <TableCell className="text-center">
                      ${stock.pricePerSqInch.toFixed(7)}
                    </TableCell>
                    <TableCell className="text-center">
                      {stock.vendorPricePerSqInch ? (
                        <div className="text-xs space-y-1">
                          <div className="text-gray-600">
                            Vendor: ${stock.vendorPricePerSqInch.toFixed(4)}
                          </div>
                          <div className="font-medium text-green-600">
                            {stock.markupType === 'PERCENTAGE'
                              ? `+${stock.markupValue}%`
                              : `+$${stock.markupValue?.toFixed(4)}`}
                          </div>
                          {stock.profitMargin && (
                            <div className="text-blue-600">
                              Profit: ${stock.profitMargin.toFixed(4)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No markup</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {stock.paperStockCoatings.length > 0 ? (
                          stock.paperStockCoatings.map((pc) => (
                            <Badge key={pc.coating.id} className="text-xs" variant="outline">
                              {pc.coating.name}
                              {pc.isDefault && <span className="ml-1 font-bold">★</span>}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {stock.paperStockSides.length > 0 ? (
                          stock.paperStockSides.map((ps) => (
                            <Badge key={ps.sidesOption.id} className="text-xs" variant="outline">
                              {ps.sidesOption.name} ({ps.priceMultiplier}x)
                              {ps.isDefault && <span className="ml-1 font-bold">★</span>}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={stock.isActive ? 'default' : 'secondary'}>
                        {stock.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          title="Duplicate"
                          variant="outline"
                          onClick={() => handleDuplicate(stock)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          title="Edit"
                          variant="outline"
                          onClick={() => handleEdit(stock)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          disabled={(stock.productsCount ?? 0) > 0}
                          size="sm"
                          title="Delete"
                          variant="outline"
                          onClick={() => openDeleteDialog(stock)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Paper Stock</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingStock?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coating Creation Modal */}
      <CoatingCreationModal
        open={coatingModalOpen}
        onCoatingCreated={handleCoatingCreated}
        onOpenChange={setCoatingModalOpen}
      />

      {/* Sides Creation Modal */}
      <SidesCreationModal
        open={sidesModalOpen}
        onOpenChange={setSidesModalOpen}
        onSidesCreated={handleSidesCreated}
      />
    </div>
  )
}
