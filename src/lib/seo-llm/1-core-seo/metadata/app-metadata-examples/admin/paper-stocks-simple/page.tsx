'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, GripVertical, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import toast from '@/lib/toast'

interface PaperStock {
  id: string
  name: string
  basePrice: number // Price per square inch
  shippingWeight: number // Weight per 1000 sheets
  sortOrder: number
  isDefault: boolean
  isActive: boolean
}

export default function SimplePaperStocksPage() {
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0.00001234,
    shippingWeight: 0.5,
    sortOrder: 0,
    isDefault: false,
    isActive: true,
  })

  useEffect(() => {
    fetchPaperStocks()
  }, [])

  const fetchPaperStocks = async () => {
    try {
      // Simulated data for now
      const mockData: PaperStock[] = [
        {
          id: '1',
          name: '14pt C1S',
          basePrice: 0.00001,
          shippingWeight: 0.45,
          sortOrder: 1,
          isDefault: false,
          isActive: true,
        },
        {
          id: '2',
          name: '16pt C2S',
          basePrice: 0.00001234,
          shippingWeight: 0.5,
          sortOrder: 2,
          isDefault: true,
          isActive: true,
        },
        {
          id: '3',
          name: '100lb Gloss Cover',
          basePrice: 0.00001456,
          shippingWeight: 0.6,
          sortOrder: 3,
          isDefault: false,
          isActive: true,
        },
        {
          id: '4',
          name: 'Premium Silk',
          basePrice: 0.00001678,
          shippingWeight: 0.55,
          sortOrder: 4,
          isDefault: false,
          isActive: true,
        },
      ]
      setPaperStocks(mockData)
    } catch (error) {
      toast.error('Failed to load paper stocks')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (stock?: PaperStock) => {
    if (stock) {
      setEditingStock(stock)
      setFormData({
        name: stock.name,
        basePrice: stock.basePrice,
        shippingWeight: stock.shippingWeight,
        sortOrder: stock.sortOrder,
        isDefault: stock.isDefault,
        isActive: stock.isActive,
      })
    } else {
      setEditingStock(null)
      setFormData({
        name: '',
        basePrice: 0.00001234,
        shippingWeight: 0.5,
        sortOrder: paperStocks.length + 1,
        isDefault: false,
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      // If setting as default, unset other defaults
      if (formData.isDefault) {
        setPaperStocks((prev) => prev.map((stock) => ({ ...stock, isDefault: false })))
      }

      if (editingStock) {
        // Update existing
        setPaperStocks((prev) =>
          prev.map((stock) => (stock.id === editingStock.id ? { ...stock, ...formData } : stock))
        )
        toast.success('Paper stock updated')
      } else {
        // Add new
        const newStock: PaperStock = {
          id: Date.now().toString(),
          ...formData,
        }
        setPaperStocks((prev) => [...prev, newStock])
        toast.success('Paper stock added')
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error('Failed to save paper stock')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this paper stock?')) {
      setPaperStocks((prev) => prev.filter((stock) => stock.id !== id))
      toast.success('Paper stock deleted')
    }
  }

  const toggleActive = (id: string) => {
    setPaperStocks((prev) =>
      prev.map((stock) => (stock.id === id ? { ...stock, isActive: !stock.isActive } : stock))
    )
  }

  const setAsDefault = (id: string) => {
    setPaperStocks((prev) =>
      prev.map((stock) => ({
        ...stock,
        isDefault: stock.id === id,
      }))
    )
    toast.success('Default paper stock updated')
  }

  const calculatePrice = (basePrice: number, quantity: number = 500, sizeInches: number = 24) => {
    return (basePrice * sizeInches * quantity).toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Paper Stock Management</h1>
          <p className="text-muted-foreground">
            Configure available paper stocks for print products
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Paper Stock
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paper Stocks</CardTitle>
          <CardDescription>Manage your available paper types and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Base Price/sq in</TableHead>
                <TableHead>Sample Price (4x6, 500qty)</TableHead>
                <TableHead>Shipping Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paperStocks
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{stock.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      ${stock.basePrice.toFixed(8)}
                    </TableCell>
                    <TableCell>${calculatePrice(stock.basePrice)}</TableCell>
                    <TableCell>{stock.shippingWeight} lbs/1000</TableCell>
                    <TableCell>
                      <Switch
                        checked={stock.isActive}
                        onCheckedChange={() => toggleActive(stock.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {stock.isDefault ? (
                        <Badge className="bg-green-100 text-green-800">Default</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setAsDefault(stock.id)}>
                          Set Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(stock)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(stock.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStock ? 'Edit Paper Stock' : 'Add Paper Stock'}</DialogTitle>
            <DialogDescription>Configure the paper stock details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Paper Name</Label>
              <Input
                id="name"
                placeholder="e.g., 16pt C2S"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (per square inch)</Label>
              <Input
                id="basePrice"
                step="0.00000001"
                type="number"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, basePrice: parseFloat(e.target.value) }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Sample: 4x6 @ 500qty = ${calculatePrice(formData.basePrice)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingWeight">Shipping Weight (lbs per 1000 sheets)</Label>
              <Input
                id="shippingWeight"
                step="0.01"
                type="number"
                value={formData.shippingWeight}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, shippingWeight: parseFloat(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Display Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Set as Default</Label>
              <Switch
                checked={formData.isDefault}
                id="isDefault"
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isDefault: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                checked={formData.isActive}
                id="isActive"
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingStock ? 'Update' : 'Add'} Paper Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
