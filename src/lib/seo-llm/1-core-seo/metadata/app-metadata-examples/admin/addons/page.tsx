'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import toast from '@/lib/toast'

interface AddOn {
  id: string
  name: string
  description: string | null
  pricingModel: string
  configuration: any
  isActive: boolean
  sortOrder: number
  additionalTurnaroundDays: number
  _count?: {
    AddOnSetItem: number
    ProductAddOn: number
  }
}

export default function AddOnsPage() {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAddons()
  }, [])

  const fetchAddons = async () => {
    try {
      const response = await fetch('/api/addons')
      if (response.ok) {
        const data = await response.json()
        setAddons(Array.isArray(data) ? data : [])
      } else {
        toast.error('Failed to load addons')
        setAddons([])
      }
    } catch (error) {
      toast.error('Failed to load addons')
      setAddons([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const response = await fetch(`/api/addons/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Addon deleted successfully')
        fetchAddons()
      } else {
        const error = await response.json()
        toast.error(error.details || error.error || 'Failed to delete addon')
      }
    } catch (error) {
      toast.error('Failed to delete addon')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/addons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        toast.success(`Addon ${!isActive ? 'activated' : 'deactivated'}`)
        fetchAddons()
      } else {
        throw new Error('Failed to update addon')
      }
    } catch (error) {
      toast.error('Failed to update addon')
    }
  }

  const getPricingDisplay = (addon: AddOn) => {
    const config = addon.configuration
    switch (addon.pricingModel) {
      case 'FLAT':
        return `$${config.flatFee?.toFixed(2) || '0.00'}`
      case 'PERCENTAGE':
        return `${(config.percentage * 100).toFixed(0)}%`
      case 'PER_UNIT':
        return config.perPieceRate ? `$${config.perPieceRate}/piece` : 'Per Unit'
      case 'CUSTOM':
        return 'Custom'
      default:
        return addon.pricingModel
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Addon Management</h1>
          <p className="text-muted-foreground">Manage product addons and options</p>
        </div>
        <Link href="/admin/addons/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Addon
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Addons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addons.length}</div>
            <p className="text-xs text-muted-foreground">
              {addons.filter((a) => a.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flat Fee</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {addons.filter((a) => a.pricingModel === 'FLAT').length}
            </div>
            <p className="text-xs text-muted-foreground">Fixed price addons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Percentage</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {addons.filter((a) => a.pricingModel === 'PERCENTAGE').length}
            </div>
            <p className="text-xs text-muted-foreground">% based addons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {addons.filter((a) => a.pricingModel === 'CUSTOM').length}
            </div>
            <p className="text-xs text-muted-foreground">Custom pricing</p>
          </CardContent>
        </Card>
      </div>

      {/* Addons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Addons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pricing Model</TableHead>
                <TableHead>Price/Value</TableHead>
                <TableHead>Extra Days</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={7}>
                    Loading addons...
                  </TableCell>
                </TableRow>
              ) : addons.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={7}>
                    No addons found. Create your first addon to get started.
                  </TableCell>
                </TableRow>
              ) : (
                addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{addon.name}</p>
                        {addon.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {addon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{addon.pricingModel}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{getPricingDisplay(addon)}</TableCell>
                    <TableCell>
                      {addon.additionalTurnaroundDays > 0 ? (
                        <span className="text-orange-600">
                          +{addon.additionalTurnaroundDays} days
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{addon._count?.AddOnSetItem || 0} sets</div>
                        <div className="text-muted-foreground">
                          {addon._count?.ProductAddOn || 0} products
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="cursor-pointer"
                        variant={addon.isActive ? 'default' : 'secondary'}
                        onClick={() => toggleActive(addon.id, addon.isActive)}
                      >
                        {addon.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/addons/${addon.id}/edit`}>
                          <Button size="sm" title="Edit Addon" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          title="Delete Addon"
                          variant="ghost"
                          onClick={() => handleDelete(addon.id, addon.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
