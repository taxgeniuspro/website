'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Target,
  Plus,
  Users,
  TrendingUp,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
} from 'lucide-react'

interface Segment {
  id: string
  name: string
  description: string | null
  count: number
  isActive: boolean
  isDynamic: boolean
  lastUpdated: string
  createdAt: string
}

interface SegmentRule {
  field: string
  operator: string
  value: any
  type: 'user' | 'order' | 'custom'
}

const FIELD_OPTIONS = [
  { value: 'email', label: 'Email', type: 'user' },
  { value: 'name', label: 'Name', type: 'user' },
  { value: 'role', label: 'Role', type: 'user' },
  { value: 'emailVerified', label: 'Email Verified', type: 'user' },
  { value: 'marketingOptIn', label: 'Marketing Opt-in', type: 'user' },
  { value: 'createdAt', label: 'Registration Date', type: 'user' },
  { value: 'total', label: 'Order Total', type: 'order' },
  { value: 'orderCount', label: 'Number of Orders', type: 'order' },
  { value: 'totalSpent', label: 'Total Spent', type: 'order' },
  { value: 'lastOrderDate', label: 'Days Since Last Order', type: 'order' },
  { value: 'rfmScore', label: 'RFM Score', type: 'custom' },
  { value: 'engagementScore', label: 'Engagement Score', type: 'custom' },
]

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In' },
  { value: 'not_in', label: 'Not In' },
  { value: 'between', label: 'Between' },
]

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newSegment, setNewSegment] = useState<{
    name: string
    description: string
    rules: SegmentRule[]
  }>({
    name: '',
    description: '',
    rules: [{ field: '', operator: '', value: '', type: 'user' }],
  })

  useEffect(() => {
    fetchSegments()
  }, [])

  const fetchSegments = async () => {
    try {
      const response = await fetch('/api/marketing/segments')
      if (response.ok) {
        const data = await response.json()
        setSegments(data)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSegment = async () => {
    try {
      const response = await fetch('/api/marketing/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSegment.name,
          description: newSegment.description,
          rules: [
            {
              criteria: newSegment.rules,
              logic: 'AND',
            },
          ],
        }),
      })

      if (response.ok) {
        const segment = await response.json()
        setSegments((prev) => [segment, ...prev])
        setShowCreateDialog(false)
        setNewSegment({
          name: '',
          description: '',
          rules: [{ field: '', operator: '', value: '', type: 'user' }],
        })
      }
    } catch (error) {}
  }

  const handleRefreshSegment = async (segmentId: string) => {
    try {
      const response = await fetch(`/api/marketing/segments/${segmentId}/refresh`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchSegments() // Refresh the list
      }
    } catch (error) {}
  }

  const handleDeleteSegment = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return

    try {
      const response = await fetch(`/api/marketing/segments/${segmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== segmentId))
      }
    } catch (error) {}
  }

  const addRule = () => {
    setNewSegment((prev) => ({
      ...prev,
      rules: [...prev.rules, { field: '', operator: '', value: '', type: 'user' }],
    }))
  }

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    setNewSegment((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
    }))
  }

  const removeRule = (index: number) => {
    setNewSegment((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return <div className="p-6">Loading segments...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Segments</h1>
          <p className="text-gray-600 mt-2">Organize customers into targeted groups</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Segment</DialogTitle>
              <DialogDescription>
                Define criteria to automatically group customers
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Segment Name</Label>
                  <Input
                    placeholder="Enter segment name"
                    value={newSegment.name}
                    onChange={(e) => setNewSegment((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Describe this segment"
                  rows={2}
                  value={newSegment.description}
                  onChange={(e) =>
                    setNewSegment((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Criteria Rules</Label>
                <div className="space-y-3">
                  {newSegment.rules.map((rule, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Field</Label>
                        <Select
                          value={rule.field}
                          onValueChange={(value) => {
                            const field = FIELD_OPTIONS.find((f) => f.value === value)
                            updateRule(index, { field: value, type: field?.type as any })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_OPTIONS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Operator</Label>
                        <Select
                          value={rule.operator}
                          onValueChange={(value) => updateRule(index, { operator: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATOR_OPTIONS.map((operator) => (
                              <SelectItem key={operator.value} value={operator.value}>
                                {operator.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) => updateRule(index, { value: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-1">
                        {newSegment.rules.length > 1 && (
                          <Button size="sm" variant="outline" onClick={() => removeRule(index)}>
                            Remove
                          </Button>
                        )}
                        {index === newSegment.rules.length - 1 && (
                          <Button size="sm" variant="outline" onClick={addRule}>
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleCreateSegment}>
                  Create Segment
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Segments</p>
                <p className="text-3xl font-bold">{segments.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Segments</p>
                <p className="text-3xl font-bold">{segments.filter((s) => s.isActive).length}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold">
                  {segments.reduce((sum, s) => sum + s.count, 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dynamic Segments</p>
                <p className="text-3xl font-bold">{segments.filter((s) => s.isDynamic).length}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>Manage your customer segmentation rules and criteria</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={6}>
                    <div className="flex flex-col items-center gap-2">
                      <Target className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-500">No segments found</p>
                      <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                        Create your first segment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{segment.name}</div>
                        {segment.description && (
                          <div className="text-sm text-gray-500">{segment.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{segment.count.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={segment.isDynamic ? 'default' : 'outline'}>
                        {segment.isDynamic ? 'Dynamic' : 'Static'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          segment.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {segment.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(segment.lastUpdated).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="h-8 w-8 p-0" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Segment
                          </DropdownMenuItem>

                          {segment.isDynamic && (
                            <DropdownMenuItem onClick={() => handleRefreshSegment(segment.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Refresh
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleDeleteSegment(segment.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
