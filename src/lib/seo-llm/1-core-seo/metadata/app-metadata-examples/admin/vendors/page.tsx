'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Mail, Phone, Globe, Truck, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from '@/lib/toast'
import { Checkbox } from '@/components/ui/checkbox'

interface VendorAddress {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

interface Vendor {
  id: string
  name: string
  contactEmail: string
  orderEmail?: string
  phone?: string
  website?: string
  address?: VendorAddress
  supportedCarriers: string[]
  isActive: boolean
  notes?: string
  turnaroundDays: number
  minimumOrderAmount?: number
  shippingCostFormula?: string
  n8nWebhookUrl?: string
  _count?: {
    Order: number
    VendorProduct: number
    VendorPaperStock: number
  }
}

const CARRIER_OPTIONS = ['FEDEX', 'UPS', 'SOUTHWEST_CARGO']

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    orderEmail: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
    },
    isActive: true,
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors')
      if (response.ok) {
        const data = await response.json()
        setVendors(data)
      } else {
        toast.error('Failed to fetch vendors')
      }
    } catch (error) {
      toast.error('Failed to fetch vendors')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor)
      setFormData({
        name: vendor.name,
        contactEmail: vendor.contactEmail,
        orderEmail: vendor.orderEmail || '',
        phone: vendor.phone || '',
        address: vendor.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'USA',
        },
        isActive: vendor.isActive,
      })
    } else {
      setEditingVendor(null)
      setFormData({
        name: '',
        contactEmail: '',
        orderEmail: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'USA',
        },
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const url = editingVendor ? '/api/vendors' : '/api/vendors'
      const method = editingVendor ? 'PUT' : 'POST'
      const body = editingVendor ? { id: editingVendor.id, ...formData } : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(`Vendor ${editingVendor ? 'updated' : 'created'} successfully`)
        fetchVendors()
        setIsDialogOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save vendor')
      }
    } catch (error) {
      toast.error('Failed to save vendor')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this vendor?')) return

    try {
      const response = await fetch(`/api/vendors?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Vendor deactivated successfully')
        fetchVendors()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate vendor')
      }
    } catch (error) {
      toast.error('Failed to deactivate vendor')
    }
  }

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Manage print vendors and fulfillment partners</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Vendors</CardTitle>
          <CardDescription>
            <Input
              className="max-w-sm"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Carriers</TableHead>
                <TableHead>Turnaround</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{vendor.name}</div>
                      {vendor.website && (
                        <a
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          href={vendor.website}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {vendor.contactEmail}
                      </div>
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {vendor.supportedCarriers.map((carrier) => (
                        <Badge key={carrier} className="text-xs" variant="secondary">
                          {carrier}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{vendor.turnaroundDays} days</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{vendor._count?.Order || 0} orders</div>
                      <div className="text-xs text-muted-foreground">
                        {vendor._count?.VendorProduct || 0} products
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/vendors/${vendor.id}`}>
                        <Button size="icon" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(vendor)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(vendor.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>Configure vendor details and integration settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  required
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  required
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="orderEmail">Order Email</Label>
                <Input
                  id="orderEmail"
                  placeholder="orders@vendor.com"
                  type="email"
                  value={formData.orderEmail}
                  onChange={(e) => setFormData({ ...formData, orderEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shipping Address *</Label>
              <p className="text-sm text-muted-foreground">
                This address will be used as the "Ship From" address for FedEx/carrier rates
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Street Address"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="State"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                />
                <Input
                  placeholder="ZIP Code"
                  value={formData.address.zip}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, zip: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                id="isActive"
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active Vendor</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingVendor ? 'Update' : 'Create'} Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
