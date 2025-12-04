'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Zap,
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Users,
  Clock,
} from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description: string | null
  isActive: boolean
  trigger: Record<string, unknown>
  steps: Record<string, unknown>[]
  createdAt: string
  updatedAt: string
  segment?: {
    id: string
    name: string
  }
  _count?: {
    executions: number
  }
}

export default function AutomationPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/marketing/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const endpoint = isActive
        ? `/api/marketing/workflows/${workflowId}/deactivate`
        : `/api/marketing/workflows/${workflowId}/activate`

      const response = await fetch(endpoint, { method: 'POST' })

      if (response.ok) {
        fetchWorkflows() // Refresh the list
      }
    } catch (error) {}
  }

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const response = await fetch(`/api/marketing/workflows/${workflowId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWorkflows((prev) => prev.filter((w) => w.id !== workflowId))
      }
    } catch (error) {}
  }

  const getTriggerLabel = (trigger: Record<string, unknown>) => {
    switch (trigger.type) {
      case 'event':
        return `Event: ${typeof trigger.event === 'string' ? trigger.event.replace(/_/g, ' ') : 'Unknown'}`
      case 'schedule':
        return `Schedule: ${(trigger.schedule as any)?.type || 'Unknown'}`
      case 'condition':
        return `Condition: ${(trigger.condition as any)?.field || 'Unknown'}`
      default:
        return 'Unknown trigger'
    }
  }

  if (loading) {
    return <div className="p-6">Loading automation workflows...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Automation</h1>
          <p className="text-gray-600 mt-2">Create automated workflows to engage customers</p>
        </div>

        <Button onClick={() => router.push('/admin/marketing/automation/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                <p className="text-3xl font-bold">{workflows.length}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                <p className="text-3xl font-bold">{workflows.filter((w) => w.isActive).length}</p>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-3xl font-bold">
                  {workflows.reduce((sum, w) => sum + (w._count?.executions || 0), 0)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Steps</p>
                <p className="text-3xl font-bold">
                  {workflows.length > 0
                    ? Math.round(
                        workflows.reduce((sum, w) => sum + w.steps.length, 0) / workflows.length
                      )
                    : 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Workflows</CardTitle>
          <CardDescription>Manage your automated marketing workflows</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executions</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={7}>
                    <div className="flex flex-col items-center gap-2">
                      <Zap className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-500">No workflows found</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/admin/marketing/automation/new')}
                      >
                        Create your first workflow
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-gray-500">{workflow.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{getTriggerLabel(workflow.trigger)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.steps.length} steps</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          workflow.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{workflow._count?.executions || 0}</TableCell>
                    <TableCell>{new Date(workflow.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="h-8 w-8 p-0" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/marketing/automation/${workflow.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/marketing/automation/${workflow.id}/edit`)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Workflow
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleToggleWorkflow(workflow.id, workflow.isActive)}
                          >
                            {workflow.isActive ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/marketing/automation/${workflow.id}/analytics`)
                            }
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleDeleteWorkflow(workflow.id)}>
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

      {/* Quick Start Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
          <CardDescription>Get started quickly with pre-built workflow templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Welcome Series</h4>
                    <p className="text-sm text-gray-600">Onboard new customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Cart Abandonment</h4>
                    <p className="text-sm text-gray-600">Recover lost sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Win-back Campaign</h4>
                    <p className="text-sm text-gray-600">Re-engage dormant customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
