'use client'

import { useState, useEffect, use } from 'react'
import { ArrowLeft, Plus, Trash2, ArrowRight, Shield, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import Link from 'next/link'
import toast from '@/lib/toast'
import * as Icons from 'lucide-react'

interface OrderStatus {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  badgeColor: string
}

interface Transition {
  id: string
  toStatusId: string
  requiresPayment: boolean
  requiresAdmin: boolean
  ToStatus: OrderStatus
}

interface TransitionsResponse {
  currentStatus: OrderStatus
  transitions: Transition[]
  availableStatuses: OrderStatus[]
  total: number
}

export default function TransitionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<OrderStatus | null>(null)
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<OrderStatus[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [requiresPayment, setRequiresPayment] = useState(false)
  const [requiresAdmin, setRequiresAdmin] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchTransitions()
  }, [resolvedParams.id])

  const fetchTransitions = async () => {
    try {
      const response = await fetch(`/api/admin/order-statuses/${resolvedParams.id}/transitions`)
      if (response.ok) {
        const data: TransitionsResponse = await response.json()
        setCurrentStatus(data.currentStatus)
        setTransitions(data.transitions)
        setAvailableStatuses(data.availableStatuses)
      } else {
        toast.error('Failed to load transitions')
      }
    } catch (error) {
      toast.error('Failed to load transitions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransition = async () => {
    if (!selectedStatus) {
      toast.error('Please select a target status')
      return
    }

    setAdding(true)
    try {
      const response = await fetch(`/api/admin/order-statuses/${resolvedParams.id}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatusId: selectedStatus,
          requiresPayment,
          requiresAdmin,
        }),
      })

      if (response.ok) {
        toast.success('Transition added successfully')
        setDialogOpen(false)
        setSelectedStatus('')
        setRequiresPayment(false)
        setRequiresAdmin(false)
        fetchTransitions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add transition')
      }
    } catch (error) {
      toast.error('Failed to add transition')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteTransition = async (toStatusId: string, toStatusName: string) => {
    if (!confirm(`Remove transition to "${toStatusName}"?`)) return

    try {
      const response = await fetch(
        `/api/admin/order-statuses/${resolvedParams.id}/transitions?toStatusId=${toStatusId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Transition removed successfully')
        fetchTransitions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove transition')
      }
    } catch (error) {
      toast.error('Failed to remove transition')
    }
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading transitions...</p>
      </div>
    )
  }

  if (!currentStatus) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Status not found</p>
      </div>
    )
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
            <h1 className="text-3xl font-bold">Manage Transitions</h1>
            <p className="text-muted-foreground">
              Configure valid status changes from <strong>{currentStatus.name}</strong>
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableStatuses.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Transition</DialogTitle>
              <DialogDescription>
                Allow orders in "{currentStatus.name}" to transition to another status
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="toStatus">Target Status *</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="toStatus">
                    <SelectValue placeholder="Select a status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={requiresPayment}
                  id="requiresPayment"
                  onCheckedChange={(checked) => setRequiresPayment(checked as boolean)}
                />
                <Label className="cursor-pointer" htmlFor="requiresPayment">
                  Requires payment confirmation
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={requiresAdmin}
                  id="requiresAdmin"
                  onCheckedChange={(checked) => setRequiresAdmin(checked as boolean)}
                />
                <Label className="cursor-pointer" htmlFor="requiresAdmin">
                  Requires admin approval
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button disabled={adding || !selectedStatus} onClick={handleAddTransition}>
                {adding ? 'Adding...' : 'Add Transition'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Status Info */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-white dark:bg-gray-900">
              {getIconComponent(currentStatus.icon)}
            </div>
            <div>
              <p className="font-bold">{currentStatus.name}</p>
              <code className="text-xs text-muted-foreground">{currentStatus.slug}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transitions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Valid Transitions ({transitions.length})</CardTitle>
          <CardDescription>
            Orders in "{currentStatus.name}" can transition to these statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transitions.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No transitions configured</p>
                <p className="text-xs text-muted-foreground">
                  Add your first transition to enable status changes
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead className="text-center">
                    <ArrowRight className="mx-auto h-4 w-4" />
                  </TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transitions.map((transition) => (
                  <TableRow key={transition.id}>
                    {/* From Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                          {getIconComponent(currentStatus.icon)}
                        </div>
                        <span className="font-medium">{currentStatus.name}</span>
                      </div>
                    </TableCell>

                    {/* Arrow */}
                    <TableCell className="text-center">
                      <ArrowRight className="mx-auto h-4 w-4 text-muted-foreground" />
                    </TableCell>

                    {/* To Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                          {getIconComponent(transition.ToStatus.icon)}
                        </div>
                        <span className="font-medium">{transition.ToStatus.name}</span>
                      </div>
                    </TableCell>

                    {/* Requirements */}
                    <TableCell>
                      <div className="flex gap-1">
                        {transition.requiresPayment && (
                          <Badge className="text-xs" variant="outline">
                            <CreditCard className="mr-1 h-3 w-3" />
                            Payment
                          </Badge>
                        )}
                        {transition.requiresAdmin && (
                          <Badge className="text-xs" variant="outline">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {!transition.requiresPayment && !transition.requiresAdmin && (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleDeleteTransition(transition.ToStatus.id, transition.ToStatus.name)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="text-sm">How Transitions Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>Workflow Engine:</strong> Only transitions defined here are allowed. Attempts to
            change to other statuses will be rejected.
          </p>
          <p>
            <strong>Requirements:</strong> If a transition requires payment, it can only be executed
            if the order is paid. Admin-required transitions can only be executed by administrators.
          </p>
          <p>
            <strong>Bidirectional:</strong> Transitions are one-way. If you want to allow going
            back, create a reverse transition.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
