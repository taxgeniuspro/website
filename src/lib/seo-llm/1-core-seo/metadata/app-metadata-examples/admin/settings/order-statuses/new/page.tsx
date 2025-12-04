'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

export default function NewOrderStatusPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

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
  })

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/order-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          emailTemplateId: formData.emailTemplateId || null,
        }),
      })

      if (response.ok) {
        toast.success('Custom status created successfully')
        router.push('/admin/settings/order-statuses')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create status')
      }
    } catch (error) {
      toast.error('Failed to create status')
    } finally {
      setSaving(false)
    }
  }

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
            <h1 className="text-3xl font-bold">Create Custom Status</h1>
            <p className="text-muted-foreground">Add a new custom order status to your workflow</p>
          </div>
        </div>
        <Button disabled={saving} form="create-status-form" type="submit">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Creating...' : 'Create Status'}
        </Button>
      </div>

      {/* Form */}
      <form id="create-status-form" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Define the name and appearance of your status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Status Name *</Label>
                  <Input
                    required
                    id="name"
                    maxLength={50}
                    placeholder="e.g., Quality Check"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    required
                    id="slug"
                    maxLength={50}
                    pattern="^[A-Z0-9_]+$"
                    placeholder="e.g., QUALITY_CHECK"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value.toUpperCase() }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Uppercase letters, numbers, and underscores only
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this status means..."
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
              <CardDescription>Customize how this status appears in the UI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select
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
              <CardDescription>Configure how this status affects orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPaid">Payment Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Orders in this status have been paid
                  </p>
                </div>
                <Switch
                  checked={formData.isPaid}
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
