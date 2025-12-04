'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import toast from '@/lib/toast'

interface PaperStock {
  id: string
  name: string
  basePrice: number
  shippingWeight: number
  isActive: boolean
  coatings: Array<{
    id: string
    label: string
    enabled: boolean
  }>
  sidesOptions: Array<{
    id: string
    label: string
    enabled: boolean
    multiplier: number
  }>
  defaultCoating: string
  defaultSides: string
}

interface Size {
  id: string
  displayName: string
  width: number
  height: number
  squareInches: number
}

interface Quantity {
  id: string
  value: number
  isDefault: boolean
}

interface ProductConfig {
  id: string
  name: string
  sku: string
  selectedPaperStocks: string[]
  selectedSizes: string[]
  selectedQuantities: string[]
  defaultPaperStock: string
  defaultSize: string
  defaultQuantity: string
}

export default function ConfigureProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [product, setProduct] = useState<ProductConfig | null>(null)
  const [availablePaperStocks, setAvailablePaperStocks] = useState<PaperStock[]>([])
  const [availableSizes, setAvailableSizes] = useState<Size[]>([])
  const [availableQuantities, setAvailableQuantities] = useState<Quantity[]>([])

  useEffect(() => {
    fetchProductData()
  }, [id])

  const fetchProductData = async () => {
    try {
      // Mock data - would come from API
      const mockProduct: ProductConfig = {
        id: id,
        name: 'Standard Flyers',
        sku: 'FLY-001',
        selectedPaperStocks: [],
        selectedSizes: ['1', '2', '3'],
        selectedQuantities: ['1', '2', '3', '4'],
        defaultPaperStock: '',
        defaultSize: '1',
        defaultQuantity: '3',
      }

      // Load paper stocks from API
      const res = await fetch('/api/paper-stocks')
      if (res.ok) {
        const paperStocks: PaperStock[] = await res.json()

        // Only show active paper stocks
        const activePaperStocks = paperStocks.filter((ps) => ps.isActive)
        setAvailablePaperStocks(activePaperStocks)

        // Set selected paper stocks if any
        if (activePaperStocks.length > 0) {
          mockProduct.selectedPaperStocks = activePaperStocks.map((ps) => ps.id)
          mockProduct.defaultPaperStock = activePaperStocks[0].id
        }
      }

      const mockSizes: Size[] = [
        { id: '1', displayName: '4x6', width: 4, height: 6, squareInches: 24 },
        { id: '2', displayName: '5x7', width: 5, height: 7, squareInches: 35 },
        { id: '3', displayName: '8.5x11', width: 8.5, height: 11, squareInches: 93.5 },
        { id: '4', displayName: '8.5x14', width: 8.5, height: 14, squareInches: 119 },
        { id: '5', displayName: '11x17', width: 11, height: 17, squareInches: 187 },
      ]

      const mockQuantities: Quantity[] = [
        { id: '1', value: 100, isDefault: false },
        { id: '2', value: 250, isDefault: false },
        { id: '3', value: 500, isDefault: true },
        { id: '4', value: 1000, isDefault: false },
        { id: '5', value: 2500, isDefault: false },
        { id: '6', value: 5000, isDefault: false },
      ]

      setProduct(mockProduct)
      setAvailableSizes(mockSizes)
      setAvailableQuantities(mockQuantities)
    } catch (error) {
      toast.error('Failed to load product configuration')
    } finally {
      setLoading(false)
    }
  }

  const handlePaperStockToggle = (paperStockId: string) => {
    if (!product) return

    const isSelected = product.selectedPaperStocks.includes(paperStockId)
    if (isSelected) {
      // Remove if it's not the only one selected
      if (product.selectedPaperStocks.length > 1) {
        setProduct({
          ...product,
          selectedPaperStocks: product.selectedPaperStocks.filter((id) => id !== paperStockId),
          defaultPaperStock:
            product.defaultPaperStock === paperStockId
              ? product.selectedPaperStocks.find((id) => id !== paperStockId) || ''
              : product.defaultPaperStock,
        })
      } else {
        toast.error('At least one material type must be selected')
      }
    } else {
      // Add
      setProduct({
        ...product,
        selectedPaperStocks: [...product.selectedPaperStocks, paperStockId],
        defaultPaperStock:
          product.selectedPaperStocks.length === 0 ? paperStockId : product.defaultPaperStock,
      })
    }
  }

  const handleSizeToggle = (sizeId: string) => {
    if (!product) return

    const isSelected = product.selectedSizes.includes(sizeId)
    if (isSelected) {
      if (product.selectedSizes.length > 1) {
        setProduct({
          ...product,
          selectedSizes: product.selectedSizes.filter((id) => id !== sizeId),
          defaultSize:
            product.defaultSize === sizeId
              ? product.selectedSizes.find((id) => id !== sizeId) || ''
              : product.defaultSize,
        })
      } else {
        toast.error('At least one size must be selected')
      }
    } else {
      setProduct({
        ...product,
        selectedSizes: [...product.selectedSizes, sizeId],
        defaultSize: product.selectedSizes.length === 0 ? sizeId : product.defaultSize,
      })
    }
  }

  const handleQuantityToggle = (qtyId: string) => {
    if (!product) return

    const isSelected = product.selectedQuantities.includes(qtyId)
    if (isSelected) {
      if (product.selectedQuantities.length > 1) {
        setProduct({
          ...product,
          selectedQuantities: product.selectedQuantities.filter((id) => id !== qtyId),
          defaultQuantity:
            product.defaultQuantity === qtyId
              ? product.selectedQuantities.find((id) => id !== qtyId) || ''
              : product.defaultQuantity,
        })
      } else {
        toast.error('At least one quantity must be selected')
      }
    } else {
      setProduct({
        ...product,
        selectedQuantities: [...product.selectedQuantities, qtyId],
        defaultQuantity: product.selectedQuantities.length === 0 ? qtyId : product.defaultQuantity,
      })
    }
  }

  const handleSetDefault = (type: 'paperStock' | 'size' | 'quantity', id: string) => {
    if (!product) return

    if (type === 'paperStock') {
      setProduct({ ...product, defaultPaperStock: id })
    } else if (type === 'size') {
      setProduct({ ...product, defaultSize: id })
    } else {
      setProduct({ ...product, defaultQuantity: id })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Would save to API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Product configuration saved')
      router.push('/admin/products')
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !product) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading product configuration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Configure {product.name}</h1>
            <p className="text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        <Button disabled={saving} onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <Tabs className="space-y-4" defaultValue="material">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="material">
            Paper Stocks ({product.selectedPaperStocks.length})
          </TabsTrigger>
          <TabsTrigger value="sizes">Sizes ({product.selectedSizes.length})</TabsTrigger>
          <TabsTrigger value="quantities">
            Quantities ({product.selectedQuantities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material">
          <Card>
            <CardHeader>
              <CardTitle>Paper Stock Configuration</CardTitle>
              <CardDescription>
                Select which material types are available for this product. Paper stocks are managed
                centrally in the Paper Stocks section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availablePaperStocks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No material types found. Please create material types first.
                  </p>
                  <Button asChild>
                    <Link href="/admin/paper-stocks">Go to Material Management</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Active</TableHead>
                      <TableHead>Paper Stock</TableHead>
                      <TableHead>Base Price/sq in</TableHead>
                      <TableHead>Available Options</TableHead>
                      <TableHead>Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availablePaperStocks.map((paperStock) => {
                      const isSelected = product.selectedPaperStocks.includes(paperStock.id)
                      const isDefault = product.defaultPaperStock === paperStock.id
                      const samplePrice = (paperStock.basePrice * 24 * 500).toFixed(2)

                      return (
                        <TableRow key={paperStock.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handlePaperStockToggle(paperStock.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{paperStock.name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            ${paperStock.basePrice.toFixed(8)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Badge className="text-xs" variant="outline">
                                {paperStock.coatings.length} coatings
                              </Badge>
                              <Badge className="text-xs" variant="outline">
                                {paperStock.sidesOptions.length} sides
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isSelected &&
                              (isDefault ? (
                                <Badge className="bg-green-100 text-green-800">Default</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSetDefault('paperStock', paperStock.id)}
                                >
                                  Set Default
                                </Button>
                              ))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizes">
          <Card>
            <CardHeader>
              <CardTitle>Size Configuration</CardTitle>
              <CardDescription>Select which sizes are available for this product</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Active</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Square Inches</TableHead>
                    <TableHead>Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSizes.map((size) => {
                    const isSelected = product.selectedSizes.includes(size.id)
                    const isDefault = product.defaultSize === size.id

                    return (
                      <TableRow key={size.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSizeToggle(size.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{size.displayName}</TableCell>
                        <TableCell>
                          {size.width}" × {size.height}"
                        </TableCell>
                        <TableCell>{size.squareInches} sq in</TableCell>
                        <TableCell>
                          {isSelected &&
                            (isDefault ? (
                              <Badge className="bg-green-100 text-green-800">Default</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetDefault('size', size.id)}
                              >
                                Set Default
                              </Button>
                            ))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quantities">
          <Card>
            <CardHeader>
              <CardTitle>Quantity Configuration</CardTitle>
              <CardDescription>
                Select which quantities are available for this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Active</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableQuantities.map((qty) => {
                    const isSelected = product.selectedQuantities.includes(qty.id)
                    const isDefault = product.defaultQuantity === qty.id

                    return (
                      <TableRow key={qty.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleQuantityToggle(qty.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{qty.value.toLocaleString()}</TableCell>
                        <TableCell>
                          {isSelected &&
                            (isDefault ? (
                              <Badge className="bg-green-100 text-green-800">Default</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetDefault('quantity', qty.id)}
                              >
                                Set Default
                              </Button>
                            ))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Selected Paper Stocks:</p>
            <div className="flex flex-wrap gap-2">
              {product.selectedPaperStocks.map((id) => {
                const paperStock = availablePaperStocks.find((ps) => ps.id === id)
                return paperStock ? (
                  <Badge
                    key={id}
                    variant={id === product.defaultPaperStock ? 'default' : 'secondary'}
                  >
                    {paperStock.name}
                    {id === product.defaultPaperStock && ' (Default)'}
                  </Badge>
                ) : null
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Selected Sizes:</p>
            <div className="flex flex-wrap gap-2">
              {product.selectedSizes.map((id) => {
                const size = availableSizes.find((s) => s.id === id)
                return size ? (
                  <Badge key={id} variant={id === product.defaultSize ? 'default' : 'secondary'}>
                    {size.displayName}
                    {id === product.defaultSize && ' (Default)'}
                  </Badge>
                ) : null
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Selected Quantities:</p>
            <div className="flex flex-wrap gap-2">
              {product.selectedQuantities.map((id) => {
                const qty = availableQuantities.find((q) => q.id === id)
                return qty ? (
                  <Badge
                    key={id}
                    variant={id === product.defaultQuantity ? 'default' : 'secondary'}
                  >
                    {qty.value.toLocaleString()}
                    {id === product.defaultQuantity && ' (Default)'}
                  </Badge>
                ) : null
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
