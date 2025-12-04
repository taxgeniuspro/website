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
  ArrowUp,
  ArrowDown,
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

interface AddOn {
  id: string
  name: string
  description: string | null
  pricingModel: string
  configuration: any
  isActive: boolean
}

interface AddOnSetItem {
  id: string
  addOnId: string
  displayPosition: 'ABOVE_DROPDOWN' | 'IN_DROPDOWN' | 'BELOW_DROPDOWN'
  isDefault: boolean
  sortOrder: number
  addOn: AddOn
}

interface AddOnSet {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  addOnSetItems: AddOnSetItem[]
  _count: {
    addOnSetItems: number
    productAddOnSets: number
  }
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
    <div ref={setNodeRef} style={style} {...attributes}>
      {children}
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  )
}

export default function AddOnSetsPage() {
  const [addOnSets, setAddOnSets] = useState<AddOnSet[]>([])
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingSet, setEditingSet] = useState<AddOnSet | null>(null)
  const [expandedSet, setExpandedSet] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedAddOns, setSelectedAddOns] = useState<{
    [key: string]: {
      displayPosition: 'ABOVE_DROPDOWN' | 'IN_DROPDOWN' | 'BELOW_DROPDOWN'
      isDefault: boolean
    }
  }>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchAddOnSets()
    fetchAddOns()
  }, [])

  const fetchAddOnSets = async () => {
    try {
      const response = await fetch('/api/addon-sets?include=items')
      if (response.ok) {
        const data = await response.json()
        setAddOnSets(data)
      } else {
        toast.error('Failed to fetch addon sets')
      }
    } catch (error) {
      toast.error('Failed to fetch addon sets')
    } finally {
      setLoading(false)
    }
  }

  const fetchAddOns = async () => {
    try {
      const response = await fetch('/api/add-ons')
      if (response.ok) {
        const result = await response.json()
        // The API returns { data: [...] } structure
        const addonsArray = result.data || result
        setAddOns(addonsArray.filter((addon: AddOn) => addon.isActive))
      } else {
        toast.error('Failed to fetch addons')
      }
    } catch (error) {
      toast.error('Failed to fetch addons')
    }
  }

  const handleCreateSet = () => {
    setEditingSet(null)
    setFormData({ name: '', description: '' })
    setSelectedAddOns({})
    setShowDialog(true)
  }

  const handleEditSet = (set: AddOnSet) => {
    setEditingSet(set)
    setFormData({
      name: set.name,
      description: set.description || '',
    })

    // Populate selected addons
    const selectedData: typeof selectedAddOns = {}
    set.addOnSetItems.forEach((item) => {
      selectedData[item.addOnId] = {
        displayPosition: item.displayPosition,
        isDefault: item.isDefault,
      }
    })
    setSelectedAddOns(selectedData)
    setShowDialog(true)
  }

  const handleSaveSet = async () => {
    try {
      const addOnItems = Object.entries(selectedAddOns).map(([addOnId, config], index) => ({
        addOnId,
        displayPosition: config.displayPosition,
        isDefault: config.isDefault,
        sortOrder: index,
      }))

      const url = editingSet ? `/api/addon-sets/${editingSet.id}` : '/api/addon-sets'
      const method = editingSet ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          addOnItems: editingSet ? addOnItems : undefined,
          addOnIds: !editingSet ? Object.keys(selectedAddOns) : undefined,
        }),
      })

      if (response.ok) {
        toast.success(editingSet ? 'Addon set updated' : 'Addon set created')
        setShowDialog(false)
        fetchAddOnSets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save addon set')
      }
    } catch (error) {
      toast.error('Failed to save addon set')
    }
  }

  const handleDeleteSet = async (set: AddOnSet) => {
    // Show warning if addon set is in use
    if (set._count.productAddOnSets > 0) {
      const confirmMessage = `"${set.name}" is currently used by ${set._count.productAddOnSets} product(s).\n\nDeleting this will remove it from all products.\n\nAre you sure you want to continue?`
      if (!confirm(confirmMessage)) return
    } else {
      if (!confirm(`Are you sure you want to delete "${set.name}"?`)) return
    }

    try {
      const response = await fetch(`/api/addon-sets/${set.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }), // Force delete even if in use
      })

      if (response.ok) {
        toast.success('Addon set deleted successfully')
        fetchAddOnSets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete addon set')
      }
    } catch (error) {
      toast.error('Failed to delete addon set')
    }
  }

  const handleCloneSet = async (set: AddOnSet) => {
    const newName = prompt(`Enter name for cloned addon set:`, `${set.name} - Copy`)
    if (!newName) return

    try {
      const response = await fetch(`/api/addon-sets/${set.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (response.ok) {
        toast.success('Addon set cloned')
        fetchAddOnSets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to clone addon set')
      }
    } catch (error) {
      toast.error('Failed to clone addon set')
    }
  }

  const handleToggleAddOn = (addOnId: string) => {
    setSelectedAddOns((prev) => {
      const newSelected = { ...prev }
      if (newSelected[addOnId]) {
        delete newSelected[addOnId]
      } else {
        newSelected[addOnId] = {
          displayPosition: 'IN_DROPDOWN',
          isDefault: false,
        }
      }
      return newSelected
    })
  }

  const handleAddOnConfigChange = (
    addOnId: string,
    field: 'displayPosition' | 'isDefault',
    value: any
  ) => {
    setSelectedAddOns((prev) => ({
      ...prev,
      [addOnId]: {
        ...prev[addOnId],
        [field]: value,
      },
    }))
  }

  const getDisplayPositionBadge = (position: string) => {
    const colors = {
      ABOVE_DROPDOWN: 'bg-green-100 text-green-800',
      IN_DROPDOWN: 'bg-blue-100 text-blue-800',
      BELOW_DROPDOWN: 'bg-orange-100 text-orange-800',
    }

    const labels = {
      ABOVE_DROPDOWN: 'Above',
      IN_DROPDOWN: 'In Dropdown',
      BELOW_DROPDOWN: 'Below',
    }

    return (
      <Badge className={colors[position as keyof typeof colors]}>
        {labels[position as keyof typeof labels]}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Add-on Sets</h1>
          <p className="text-gray-600 mt-2">
            Manage collections of add-ons with customizable display positions
          </p>
        </div>
        <Button onClick={handleCreateSet}>
          <Plus className="h-4 w-4 mr-2" />
          Create Add-on Set
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add-on Sets ({addOnSets.length})</CardTitle>
          <CardDescription>
            Create and manage add-on sets that can be assigned to products with configurable display
            positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {addOnSets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No addon sets found</p>
              <Button className="mt-4" onClick={handleCreateSet}>
                Create your first addon set
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addOnSets.map((set) => (
                <div key={set.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                      >
                        {expandedSet === set.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <h3 className="font-semibold">{set.name}</h3>
                        {set.description && (
                          <p className="text-sm text-gray-600">{set.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {set._count.addOnSetItems} addons
                          </span>
                          <span className="text-xs text-gray-500">
                            {set._count.productAddOnSets} products
                          </span>
                          {set.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleCloneSet(set)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditSet(set)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteSet(set)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedSet === set.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Above Dropdown */}
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-green-700">
                            Above Dropdown
                          </h4>
                          <div className="space-y-2">
                            {set.addOnSetItems
                              .filter((item) => item.displayPosition === 'ABOVE_DROPDOWN')
                              .map((item) => (
                                <div key={item.id} className="p-2 bg-green-50 rounded text-sm">
                                  <div className="font-medium">{item.addOn?.name}</div>
                                  {item.isDefault && (
                                    <Badge className="text-xs" variant="outline">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* In Dropdown */}
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-blue-700">In Dropdown</h4>
                          <div className="space-y-2">
                            {set.addOnSetItems
                              .filter((item) => item.displayPosition === 'IN_DROPDOWN')
                              .map((item) => (
                                <div key={item.id} className="p-2 bg-blue-50 rounded text-sm">
                                  <div className="font-medium">{item.addOn?.name}</div>
                                  {item.isDefault && (
                                    <Badge className="text-xs" variant="outline">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Below Dropdown */}
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-orange-700">
                            Below Dropdown
                          </h4>
                          <div className="space-y-2">
                            {set.addOnSetItems
                              .filter((item) => item.displayPosition === 'BELOW_DROPDOWN')
                              .map((item) => (
                                <div key={item.id} className="p-2 bg-orange-50 rounded text-sm">
                                  <div className="font-medium">{item.addOn?.name}</div>
                                  {item.isDefault && (
                                    <Badge className="text-xs" variant="outline">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSet ? 'Edit Add-on Set' : 'Create Add-on Set'}</DialogTitle>
            <DialogDescription>
              Configure add-on collection with display positions for products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter addon set name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold">Add-ons Configuration</Label>
              <p className="text-sm text-gray-600 mb-4">
                Select add-ons and configure their display positions
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto border rounded p-4">
                {addOns.map((addon) => (
                  <div key={addon.id} className="flex items-center space-x-4 p-3 border rounded">
                    <Checkbox
                      checked={!!selectedAddOns[addon.id]}
                      onCheckedChange={() => handleToggleAddOn(addon.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{addon.name}</div>
                      {addon.description && (
                        <div className="text-sm text-gray-600">{addon.description}</div>
                      )}
                    </div>

                    {selectedAddOns[addon.id] && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={selectedAddOns[addon.id].displayPosition}
                          onValueChange={(value) =>
                            handleAddOnConfigChange(addon.id, 'displayPosition', value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ABOVE_DROPDOWN">Above</SelectItem>
                            <SelectItem value="IN_DROPDOWN">In Dropdown</SelectItem>
                            <SelectItem value="BELOW_DROPDOWN">Below</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center space-x-1">
                          <Checkbox
                            checked={selectedAddOns[addon.id].isDefault}
                            onCheckedChange={(checked) =>
                              handleAddOnConfigChange(addon.id, 'isDefault', checked)
                            }
                          />
                          <Label className="text-xs">Default</Label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSet}>{editingSet ? 'Update' : 'Create'} Add-on Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
