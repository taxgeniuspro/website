'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Percent, Save, Loader2, Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import toast from '@/lib/toast'

interface Category {
  id: string
  name: string
  brokerDiscount: number
  _count?: {
    Product: number
  }
}

export default function MasterDiscountsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [editedDiscounts, setEditedDiscounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/product-categories?active=true&topLevel=true')
      const data = await response.json()

      // Filter out hidden categories and sort by name
      const filteredCategories = data
        .filter((cat: any) => !cat.isHidden)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))

      setCategories(filteredCategories)
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleDiscountChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value)

    if (value === '') {
      setEditedDiscounts({ ...editedDiscounts, [categoryId]: 0 })
      return
    }

    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return // Don't update with invalid values
    }

    setEditedDiscounts({ ...editedDiscounts, [categoryId]: numValue })
  }

  const handleSave = async (category: Category) => {
    const newDiscount = editedDiscounts[category.id] ?? category.brokerDiscount

    try {
      setSavingIds(new Set(savingIds).add(category.id))

      const response = await fetch(`/api/product-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: category.name,
          brokerDiscount: newDiscount,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      toast.success(`Updated ${category.name} discount to ${newDiscount}%`)

      // Update local state
      setCategories(
        categories.map((cat) =>
          cat.id === category.id ? { ...cat, brokerDiscount: newDiscount } : cat
        )
      )

      // Clear edited state
      const newEdited = { ...editedDiscounts }
      delete newEdited[category.id]
      setEditedDiscounts(newEdited)
    } catch (error) {
      toast.error('Failed to update discount')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(category.id)
        return next
      })
    }
  }

  const getCurrentDiscount = (category: Category) => {
    return editedDiscounts[category.id] ?? category.brokerDiscount
  }

  const isEdited = (categoryId: string) => {
    return categoryId in editedDiscounts
  }

  const totalWithDiscounts = categories.filter((cat) => cat.brokerDiscount > 0).length

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Master Broker Discounts
              </CardTitle>
              <CardDescription>
                Set default discount percentages for all broker customers. Individual brokers can
                have custom discounts on their account page.
              </CardDescription>
            </div>
            <Badge className="text-sm" variant="secondary">
              {totalWithDiscounts} of {categories.length} with discounts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Percent className="h-4 w-4" />
            <AlertDescription>
              These are the <strong>default discounts</strong> applied to all broker customers. You
              can override these for specific brokers on their individual customer account page.
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No active categories found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">
                      <Package className="h-4 w-4 inline mr-1" />
                      Products
                    </TableHead>
                    <TableHead className="w-[200px]">Discount %</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const currentDiscount = getCurrentDiscount(category)
                    const edited = isEdited(category.id)
                    const isSaving = savingIds.has(category.id)

                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {category.name}
                            {edited && (
                              <Badge className="text-xs" variant="outline">
                                Unsaved
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={category._count?.Product ? 'default' : 'secondary'}>
                            {category._count?.Product || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              className={`w-24 text-right ${edited ? 'border-orange-500' : ''}`}
                              disabled={isSaving}
                              max="100"
                              min="0"
                              step="0.5"
                              type="number"
                              value={currentDiscount}
                              onChange={(e) => handleDiscountChange(category.id, e.target.value)}
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            disabled={isSaving || !edited}
                            size="sm"
                            variant={edited ? 'default' : 'outline'}
                            onClick={() => handleSave(category)}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {!loading && categories.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total Categories: {categories.length} • With Discounts: {totalWithDiscounts} • Average
              Discount:{' '}
              {categories.length > 0
                ? (
                    categories.reduce((sum, cat) => sum + cat.brokerDiscount, 0) / categories.length
                  ).toFixed(1)
                : 0}
              %
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
