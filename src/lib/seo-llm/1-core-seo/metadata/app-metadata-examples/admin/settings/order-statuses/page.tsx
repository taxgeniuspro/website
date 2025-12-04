'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  GitBranch,
  List,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import * as Icons from 'lucide-react'

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
  orderCount: number
  transitionCount: number
  canDelete: boolean
  EmailTemplate?: {
    id: string
    name: string
  } | null
}

interface StatusesResponse {
  statuses: OrderStatus[]
  total: number
  coreCount: number
  customCount: number
}

export default function OrderStatusesPage() {
  const [statuses, setStatuses] = useState<OrderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, coreCount: 0, customCount: 0 })

  useEffect(() => {
    fetchStatuses()
  }, [])

  const fetchStatuses = async () => {
    try {
      const response = await fetch('/api/admin/order-statuses')
      if (response.ok) {
        const data: StatusesResponse = await response.json()
        setStatuses(data.statuses)
        setStats({
          total: data.total,
          coreCount: data.coreCount,
          customCount: data.customCount,
        })
      } else {
        toast.error('Failed to load order statuses')
        setStatuses([])
      }
    } catch (error) {
      toast.error('Failed to load order statuses')
      setStatuses([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (status: OrderStatus) => {
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

    if (!confirm(`Are you sure you want to delete "${status.name}"?`)) return

    try {
      const response = await fetch(`/api/admin/order-statuses/${status.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Status deleted successfully')
        fetchStatuses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete status')
      }
    } catch (error) {
      toast.error('Failed to delete status')
    }
  }

  const toggleActive = async (status: OrderStatus) => {
    if (status.isCore) {
      toast.error('Cannot deactivate core system statuses')
      return
    }

    try {
      const response = await fetch(`/api/admin/order-statuses/${status.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !status.isActive }),
      })

      if (response.ok) {
        toast.success(`Status ${!status.isActive ? 'activated' : 'deactivated'}`)
        fetchStatuses()
      } else {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <List className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Status Manager</h1>
          <p className="text-muted-foreground">
            Manage order statuses, workflow transitions, and automation
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/settings/order-statuses/analytics">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/settings/order-statuses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Statuses</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {statuses.filter((s) => s.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Statuses</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coreCount}</div>
            <p className="text-xs text-muted-foreground">System defaults</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Statuses</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customCount}</div>
            <p className="text-xs text-muted-foreground">User-created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <GitBranch className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statuses.reduce((sum, s) => sum + s.orderCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all statuses</p>
          </CardContent>
        </Card>
      </div>

      {/* Statuses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order Statuses</CardTitle>
          <CardDescription>
            Configure custom order statuses and manage workflow transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Transitions</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={8}>
                    Loading order statuses...
                  </TableCell>
                </TableRow>
              ) : statuses.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center" colSpan={8}>
                    No statuses found. This shouldn't happen - core statuses should exist.
                  </TableCell>
                </TableRow>
              ) : (
                statuses.map((status) => (
                  <TableRow key={status.id}>
                    {/* Status Name & Icon */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                          {getIconComponent(status.icon)}
                        </div>
                        <div>
                          <p className="font-medium">{status.name}</p>
                          {status.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {status.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Slug */}
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{status.slug}</code>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant={status.isCore ? 'default' : 'secondary'}>
                        {status.isCore ? 'Core' : 'Custom'}
                      </Badge>
                    </TableCell>

                    {/* Order Count */}
                    <TableCell>
                      <span
                        className={status.orderCount > 0 ? 'font-medium' : 'text-muted-foreground'}
                      >
                        {status.orderCount}
                      </span>
                    </TableCell>

                    {/* Transition Count */}
                    <TableCell>
                      <Link href={`/admin/settings/order-statuses/${status.id}/transitions`}>
                        <Button size="sm" variant="ghost">
                          <GitBranch className="mr-1 h-3 w-3" />
                          {status.transitionCount}
                        </Button>
                      </Link>
                    </TableCell>

                    {/* Features */}
                    <TableCell>
                      <div className="flex gap-1">
                        {status.isPaid && (
                          <Badge className="text-xs" variant="outline">
                            Paid
                          </Badge>
                        )}
                        {status.allowDownloads && (
                          <Badge className="text-xs" variant="outline">
                            Downloads
                          </Badge>
                        )}
                        {status.sendEmailOnEnter && (
                          <Badge className="text-xs" variant="outline">
                            Email
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Active Status */}
                    <TableCell>
                      <Badge
                        className={status.isCore ? '' : 'cursor-pointer'}
                        variant={status.isActive ? 'default' : 'secondary'}
                        onClick={() => !status.isCore && toggleActive(status)}
                      >
                        {status.isActive ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {status.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/settings/order-statuses/${status.id}/edit`}>
                          <Button
                            disabled={status.isCore}
                            size="sm"
                            title={status.isCore ? 'Core statuses cannot be edited' : 'Edit Status'}
                            variant="ghost"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          disabled={status.isCore || status.orderCount > 0}
                          size="sm"
                          title={
                            status.isCore
                              ? 'Core statuses cannot be deleted'
                              : status.orderCount > 0
                                ? 'Reassign orders before deleting'
                                : 'Delete Status'
                          }
                          variant="ghost"
                          onClick={() => handleDelete(status)}
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

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            About Order Status Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>Core Statuses:</strong> System-managed statuses that cannot be deleted. You can
            configure email templates and sort order, but cannot change names or slugs.
          </p>
          <p>
            <strong>Custom Statuses:</strong> User-created statuses that can be fully customized and
            deleted (if no orders are using them).
          </p>
          <p>
            <strong>Transitions:</strong> Click the transition count to configure which status
            changes are allowed. This creates a workflow engine that validates all status updates.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
