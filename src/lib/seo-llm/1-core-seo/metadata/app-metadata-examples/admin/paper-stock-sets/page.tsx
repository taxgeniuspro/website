'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Eye,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import toast from '@/lib/toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface PaperStock {
  id: string
  name: string
  weight: number
  pricePerSqInch: number
  tooltipText: string | null
  isActive: boolean
  paperStockCoatings: any[]
  paperStockSides: any[]
}

interface PaperStockGroupItem {
  id: string
  paperStockId: string
  isDefault: boolean
  sortOrder: number
  paperStock: PaperStock
}

interface PaperStockGroup {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  paperStockItems: PaperStockGroupItem[]
  productPaperStockGroups?: any[]
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} className="flex items-center gap-2" style={style}>
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      {children}
    </div>
  )
}

export default function PaperStockGroupsPage() {
  const [groups, setGroups] = useState<PaperStockGroup[]>([])
  const [allPaperStocks, setAllPaperStocks] = useState<PaperStock[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PaperStockGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<PaperStockGroup | null>(null)
  const [previewGroup, setPreviewGroup] = useState<PaperStockGroup | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
    selectedPaperStocks: [] as string[],
    defaultPaperStock: '' as string,
    paperStockOrders: {} as Record<string, number>,
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchGroups()
    fetchPaperStocks()
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/paper-stock-sets')
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()

      // Ensure each group has paperStockItems array
      const processedGroups = (Array.isArray(data) ? data : []).map((group: any) => ({
        ...group,
        paperStockItems: group.paperStockItems || [],
        productPaperStockGroups: group.productPaperStockGroups || [],
      }))

      setGroups(processedGroups)
    } catch (error) {
      toast.error('Failed to load paper stock groups')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaperStocks = async () => {
    try {
      const response = await fetch('/api/paper-stocks')
      if (!response.ok) throw new Error('Failed to fetch paper stocks')
      const data = await response.json()
      setAllPaperStocks(data.filter((stock: PaperStock) => stock.isActive))
    } catch (error) {}
  }

  const handleDragEnd = (event: DragEndEvent, groupId: string) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setGroups((groups) => {
        return groups.map((group) => {
          if (group.id === groupId) {
            const items = group.paperStockItems || []
            const oldIndex = items.findIndex((item) => item.paperStockId === active.id)
            const newIndex = items.findIndex((item) => item.paperStockId === over?.id)

            const newItems = arrayMove(items, oldIndex, newIndex)

            // Update sort orders
            const updatedItems = newItems.map((item, index) => ({
              ...item,
              sortOrder: index,
            }))

            // Save the new order to the backend
            saveReorder(groupId, updatedItems)

            return { ...group, paperStockItems: updatedItems }
          }
          return group
        })
      })
    }
  }

  const saveReorder = async (groupId: string, items: PaperStockGroupItem[]) => {
    try {
      const response = await fetch(`/api/paper-stock-sets/${groupId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            paperStockId: item.paperStockId,
            sortOrder: item.sortOrder,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save order')
      }

      toast.success('Order updated')
    } catch (error) {
      toast.error('Failed to save order')
      fetchGroups() // Reload to get original order
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.selectedPaperStocks.length === 0) {
      toast.error('Please select at least one paper stock')
      return
    }

    // Ensure a default is always selected
    let defaultStock = formData.defaultPaperStock
    if (!defaultStock || !formData.selectedPaperStocks.includes(defaultStock)) {
      // Auto-select first paper stock as default if none selected or invalid
      defaultStock = formData.selectedPaperStocks[0]
    }

    try {
      const url = editingGroup
        ? `/api/paper-stock-sets/${editingGroup.id}`
        : '/api/paper-stock-sets'
      const method = editingGroup ? 'PUT' : 'POST'

      const paperStocks = formData.selectedPaperStocks.map((stockId, index) => ({
        id: stockId,
        isDefault: stockId === defaultStock,
        sortOrder: formData.paperStockOrders[stockId] || index,
      }))

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          paperStocks,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save group')
      }

      toast.success(editingGroup ? 'Group updated' : 'Group created')
      setDialogOpen(false)
      resetForm()
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEdit = (group: PaperStockGroup) => {
    setEditingGroup(group)

    const selectedPaperStocks = (group.paperStockItems || []).map((item) => item.paperStockId)
    const defaultPaperStock =
      (group.paperStockItems || []).find((item) => item.isDefault)?.paperStockId || ''
    const paperStockOrders = (group.paperStockItems || []).reduce(
      (acc, item) => {
        acc[item.paperStockId] = item.sortOrder
        return acc
      },
      {} as Record<string, number>
    )

    setFormData({
      name: group.name,
      description: group.description || '',
      sortOrder: group.sortOrder,
      isActive: group.isActive,
      selectedPaperStocks,
      defaultPaperStock,
      paperStockOrders,
    })
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingGroup) return

    try {
      const response = await fetch(`/api/paper-stock-sets/${deletingGroup.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete group')
      }

      toast.success('Group deleted')
      setDeleteDialogOpen(false)
      setDeletingGroup(null)
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDuplicate = (group: PaperStockGroup) => {
    setEditingGroup(null)

    const selectedPaperStocks = (group.paperStockItems || []).map((item) => item.paperStockId)
    const defaultPaperStock =
      (group.paperStockItems || []).find((item) => item.isDefault)?.paperStockId || ''
    const paperStockOrders = (group.paperStockItems || []).reduce(
      (acc, item) => {
        acc[item.paperStockId] = item.sortOrder
        return acc
      },
      {} as Record<string, number>
    )

    setFormData({
      name: `${group.name} - Copy`,
      description: group.description || '',
      sortOrder: group.sortOrder,
      isActive: group.isActive,
      selectedPaperStocks,
      defaultPaperStock,
      paperStockOrders,
    })
    setDialogOpen(true)
  }

  const handlePreview = (group: PaperStockGroup) => {
    setPreviewGroup(group)
    setPreviewDialogOpen(true)
  }

  const resetForm = () => {
    setEditingGroup(null)
    setFormData({
      name: '',
      description: '',
      sortOrder: 0,
      isActive: true,
      selectedPaperStocks: [],
      defaultPaperStock: '',
      paperStockOrders: {},
    })
  }

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paper Stock Sets</h1>
        <p className="text-gray-600 mt-2">
          Group paper stocks together for organized dropdown selection on product pages
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Paper Stock Group Management</CardTitle>
              <CardDescription>
                Create groups of paper stocks with default selections for customer dropdowns
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No paper stock groups created yet. Click "Add Group" to create your first one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Paper Stocks</TableHead>
                  <TableHead className="text-center">Default Stock</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <>
                    <TableRow key={group.id}>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleGroupExpansion(group.id)}
                        >
                          {expandedGroups.has(group.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-sm text-gray-500">{group.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {group.paperStockItems?.length || 0} stocks
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium">
                            {(group.paperStockItems || []).find((item) => item.isDefault)
                              ?.paperStock.name ||
                              group.paperStockItems?.[0]?.paperStock.name ||
                              'None'}
                          </span>
                          {(group.paperStockItems?.length || 0) > 0 && (
                            <Badge className="text-xs" variant="outline">
                              DEFAULT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{group.sortOrder}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={group.isActive ? 'default' : 'secondary'}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            title="Preview"
                            variant="outline"
                            onClick={() => handlePreview(group)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title="Duplicate"
                            variant="outline"
                            onClick={() => handleDuplicate(group)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            title="Edit"
                            variant="outline"
                            onClick={() => handleEdit(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            disabled={(group.productPaperStockGroups?.length ?? 0) > 0}
                            size="sm"
                            title="Delete"
                            variant="outline"
                            onClick={() => {
                              setDeletingGroup(group)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedGroups.has(group.id) && (
                      <TableRow>
                        <TableCell className="bg-gray-50" colSpan={7}>
                          <div className="p-4">
                            <h4 className="font-medium mb-3">
                              Paper Stocks in Group (drag to reorder):
                            </h4>
                            <DndContext
                              collisionDetection={closestCenter}
                              sensors={sensors}
                              onDragEnd={(event) => handleDragEnd(event, group.id)}
                            >
                              <SortableContext
                                items={(group.paperStockItems || []).map(
                                  (item) => item.paperStockId
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {(group.paperStockItems || []).map((item) => (
                                    <SortableItem key={item.paperStockId} id={item.paperStockId}>
                                      <div className="flex items-center justify-between flex-1 p-2 bg-white rounded border">
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">
                                            {item.paperStock.name}
                                          </span>
                                          {item.isDefault && (
                                            <Badge className="text-xs" variant="secondary">
                                              DEFAULT
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <span>Weight: {item.paperStock.weight}</span>
                                          <span>•</span>
                                          <span>
                                            Price/sq in: ${item.paperStock.pricePerSqInch}
                                          </span>
                                        </div>
                                      </div>
                                    </SortableItem>
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edit Paper Stock Group' : 'Create Paper Stock Group'}
              </DialogTitle>
              <DialogDescription>
                Group paper stocks together for organized customer selection
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name *</Label>
                    <Input
                      required
                      id="name"
                      placeholder="e.g., Premium Cardstock Options"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      min="0"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this group"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    id="isActive"
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              {/* Paper Stock Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Select Paper Stocks</h3>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {allPaperStocks.map((stock) => (
                    <div key={stock.id} className="flex items-start space-x-3">
                      <Checkbox
                        checked={formData.selectedPaperStocks.includes(stock.id)}
                        id={`stock-${stock.id}`}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedPaperStocks: [...formData.selectedPaperStocks, stock.id],
                              defaultPaperStock:
                                formData.selectedPaperStocks.length === 0
                                  ? stock.id
                                  : formData.defaultPaperStock,
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selectedPaperStocks: formData.selectedPaperStocks.filter(
                                (id) => id !== stock.id
                              ),
                              defaultPaperStock:
                                formData.defaultPaperStock === stock.id
                                  ? ''
                                  : formData.defaultPaperStock,
                            })
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer" htmlFor={`stock-${stock.id}`}>
                          {stock.name}
                        </Label>
                        {stock.tooltipText && (
                          <p className="text-sm text-gray-500">{stock.tooltipText}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Default Selection */}
              {formData.selectedPaperStocks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Default Paper Stock</h3>
                    <Badge className="text-xs" variant="secondary">
                      Required
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Select which paper stock should be pre-selected when customers view this group
                  </p>
                  <RadioGroup
                    value={formData.defaultPaperStock || formData.selectedPaperStocks[0]}
                    onValueChange={(value) =>
                      setFormData({ ...formData, defaultPaperStock: value })
                    }
                  >
                    {formData.selectedPaperStocks.map((stockId) => {
                      const stock = allPaperStocks.find((s) => s.id === stockId)
                      if (!stock) return null
                      return (
                        <div
                          key={stockId}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
                        >
                          <RadioGroupItem id={`default-${stockId}`} value={stockId} />
                          <Label className="cursor-pointer flex-1" htmlFor={`default-${stockId}`}>
                            <span className="font-medium">{stock.name}</span>
                            {stock.tooltipText && (
                              <span className="text-sm text-gray-500 block">
                                {stock.tooltipText}
                              </span>
                            )}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingGroup ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Paper Stock Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview: {previewGroup?.name}</DialogTitle>
            <DialogDescription>
              This is how the paper stock dropdown will appear to customers
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-base mb-3 block">Paper Type</Label>
            <Select
              value={
                (previewGroup?.paperStockItems || []).find((item) => item.isDefault)
                  ?.paperStockId || previewGroup?.paperStockItems?.[0]?.paperStockId
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(previewGroup?.paperStockItems || []).map((item) => (
                  <SelectItem key={item.paperStockId} value={item.paperStockId}>
                    {item.paperStock.name}
                    {item.isDefault && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-2">
              The default option will be pre-selected when customers view the product.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
