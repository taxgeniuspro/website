'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import toast from '@/lib/toast'

// Common Lucide icons for order statuses
const ICON_OPTIONS = [
  'Clock',
  'CreditCard',
  'CheckCircle',
  'Package',
  'Truck',
  'MapPin',
  'XCircle',
  'AlertTriangle',
  'RefreshCw',
  'Archive',
  'FileText',
  'Mail',
  'User',
  'Settings',
  'Zap',
  'Shield',
  'Star',
]

// Tailwind color options
const COLOR_OPTIONS = [
  { label: 'Gray', value: 'gray' },
  { label: 'Red', value: 'red' },
  { label: 'Orange', value: 'orange' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Purple', value: 'purple' },
  { label: 'Pink', value: 'pink' },
]

// Badge color presets
const BADGE_COLOR_OPTIONS = [
  {
    label: 'Gray (Default)',
    value: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  },
  {
    label: 'Red (Error/Cancel)',
    value: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
  {
    label: 'Orange (Warning)',
    value: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  },
  {
    label: 'Yellow (Pending)',
    value: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
  {
    label: 'Green (Success)',
    value: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  {
    label: 'Blue (Info)',
    value: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  {
    label: 'Purple (Process)',
    value: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  },
]

interface OrderStatus {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  badgeColor: string
  isPaid: boolean
  isCore: boolean
  includeInReports: boolean
  allowDownloads: boolean
  sortOrder: number
  isActive: boolean
  sendEmailOnEnter: boolean
  emailTemplateId: string | null
  orderCount: number
  canDelete: boolean
}

export default function EditOrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<OrderStatus | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Clock',
    color: 'blue',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    isPaid: false,
    includeInReports: true,
    allowDownloads: false,
    sortOrder: 50,
    sendEmailOnEnter: false,
    emailTemplateId: '',
    isActive: true,
  })

  useEffect(() => {
    fetchStatus()
  }, [resolvedParams.id])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/admin/order-statuses/${resolvedParams.id}`)
      if (response.ok) {
        const data: OrderStatus = await response.json()
        setStatus(data)
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          icon: data.icon,
          color: data.color,
          badgeColor: data.badgeColor,
          isPaid: data.isPaid,
          includeInReports: data.includeInReports,
          allowDownloads: data.allowDownloads,
          sortOrder: data.sortOrder,
          sendEmailOnEnter: data.sendEmailOnEnter,
          emailTemplateId: data.emailTemplateId || '',
          isActive: data.isActive,
        })
      } else {
        toast.error('Failed to load status')
        router.push('/admin/settings/order-statuses')
      }
    } catch (error) {
      toast.error('Failed to load status')
      router.push('/admin/settings/order-statuses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/order-statuses/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          emailTemplateId: formData.emailTemplateId || null,
        }),
      })

      if (response.ok) {
        toast.success('Status updated successfully')
        router.push('/admin/settings/order-statuses')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!status) return

    if (status.isCore) {
      toast.error('Cannot delete core system statuses')
      return
    }

    if (status.orderCount > 0) {
      toast.error(
        `Cannot delete status with ${status.orderCount} active orders. Please reassign orders first.`
      )
      return
    }

    if (
      !confirm(`Are you sure you want to delete "${status.name}"? This action cannot be undone.`)
    ) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/order-statuses/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Status deleted successfully')
        router.push('/admin/settings/order-statuses')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete status')
      }
    } catch (error) {
      toast.error('Failed to delete status')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading status...</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Status not found</p>
      </div>
    )
  }

  const isCore = status.isCore
  const canDelete = !status.isCore && status.orderCount === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings/order-statuses">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Edit Status</h1>
              {isCore && <Badge variant="default">Core Status</Badge>}
            </div>
            <p className="text-muted-foreground">
              {isCore
                ? 'Limited editing - core statuses cannot be fully modified'
                : 'Update custom status configuration'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canDelete && (
            <Button disabled={deleting} variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Button disabled={saving} form="edit-status-form" type="submit">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Warning for Core Statuses */}
      {isCore && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-sm">Core Status - Limited Editing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            This is a system core status. You can only modify: description, sort order, email
            template, and email automation settings. Name, slug, and other core properties are
            locked.
          </CardContent>
        </Card>
      )}

      {/* Warning for Status with Orders */}
      {status.orderCount > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-sm">Active Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            This status has {status.orderCount} active orders. Deletion is disabled. You can still
            edit settings.
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form id="edit-status-form" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                {isCore ? 'Limited fields available for core statuses' : 'Update status details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Status Name *</Label>
                  <Input
                    required
                    disabled={isCore}
                    id="name"
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  {isCore && (
                    <p className="text-xs text-muted-foreground">Locked for core statuses</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input disabled required id="slug" value={formData.slug} />
                  <p className="text-xs text-muted-foreground">Cannot be changed after creation</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Visual Configuration</CardTitle>
              <CardDescription>
                {isCore ? 'Locked for core statuses' : 'Customize appearance'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select
                    disabled={isCore}
                    value={formData.icon}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger id="icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select
                    disabled={isCore}
                    value={formData.color}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger id="color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          {color.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    required
                    id="sortOrder"
                    min={0}
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badgeColor">Badge Style</Label>
                <Select
                  disabled={isCore}
                  value={formData.badgeColor}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, badgeColor: value }))}
                >
                  <SelectTrigger id="badgeColor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_COLOR_OPTIONS.map((badge) => (
                      <SelectItem key={badge.value} value={badge.value}>
                        {badge.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Behavior Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Behavior Settings</CardTitle>
              <CardDescription>Configure status behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {isCore ? 'Core statuses are always active' : 'Enable or disable this status'}
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  disabled={isCore}
                  id="isActive"
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPaid">Payment Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Orders in this status have been paid
                  </p>
                </div>
                <Switch
                  checked={formData.isPaid}
                  disabled={isCore}
                  id="isPaid"
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPaid: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="includeInReports">Include in Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Show orders in this status in reports and analytics
                  </p>
                </div>
                <Switch
                  checked={formData.includeInReports}
                  disabled={isCore}
                  id="includeInReports"
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, includeInReports: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowDownloads">Allow File Downloads</Label>
                  <p className="text-sm text-muted-foreground">
                    Customers can download their files when order is in this status
                  </p>
                </div>
                <Switch
                  checked={formData.allowDownloads}
                  disabled={isCore}
                  id="allowDownloads"
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, allowDownloads: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sendEmailOnEnter">Send Email on Status Change</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically email customer when order enters this status
                  </p>
                </div>
                <Switch
                  checked={formData.sendEmailOnEnter}
                  id="sendEmailOnEnter"
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, sendEmailOnEnter: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
