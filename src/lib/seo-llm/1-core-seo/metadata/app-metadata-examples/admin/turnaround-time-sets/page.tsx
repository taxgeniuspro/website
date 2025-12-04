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

interface TurnaroundTime {
  id: string
  name: string
  displayName: string
  daysMin: number
  daysMax: number | null
  priceMultiplier: number
  basePrice: number
  isActive: boolean
}

interface TurnaroundTimeSetItem {
  id: string
  turnaroundTimeId: string
  TurnaroundTime: TurnaroundTime
  isDefault: boolean
  sortOrder: number
  priceOverride?: number
}

interface TurnaroundTimeSet {
  id: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  TurnaroundTimeSetItem: TurnaroundTimeSetItem[]
}

function SortableSetItem({
  item,
  onToggle,
  onRemove,
  onSetDefault,
  onUpdatePriceOverride,
}: {
  item: TurnaroundTimeSetItem
  onToggle: () => void
  onRemove: () => void
  onSetDefault: () => void
  onUpdatePriceOverride: (price: number | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      }`}
      style={style}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.TurnaroundTime.displayName}</span>
          {item.isDefault && (
            <Badge className="text-xs" variant="default">
              Default
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {item.TurnaroundTime.daysMin}-{item.TurnaroundTime.daysMax || 'same'} days •
          {item.TurnaroundTime.priceMultiplier > 1
            ? ` ${((item.TurnaroundTime.priceMultiplier - 1) * 100).toFixed(0)}% surcharge`
            : ` +$${item.TurnaroundTime.basePrice.toFixed(2)}`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          className="w-24"
          placeholder="Override price"
          type="number"
          value={item.priceOverride || ''}
          onChange={(e) =>
            onUpdatePriceOverride(e.target.value ? parseFloat(e.target.value) : null)
          }
        />
        <Button disabled={item.isDefault} size="sm" variant="ghost" onClick={onSetDefault}>
          Set Default
        </Button>
        <Button className="h-8 w-8" size="icon" variant="ghost" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function TurnaroundTimeSetsPage() {
  const [sets, setSets] = useState<TurnaroundTimeSet[]>([])
  const [turnaroundTimes, setTurnaroundTimes] = useState<TurnaroundTime[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingSet, setEditingSet] = useState<TurnaroundTimeSet | null>(null)
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    selectedTurnaroundTimes: [] as string[],
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchSets()
    fetchTurnaroundTimes()
  }, [])

  const fetchSets = async () => {
    try {
      const response = await fetch('/api/turnaround-time-sets')
      if (!response.ok) throw new Error('Failed to fetch sets')
      const data = await response.json()
      setSets(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load turnaround time sets')
    } finally {
      setLoading(false)
    }
  }

  const fetchTurnaroundTimes = async () => {
    try {
      const response = await fetch('/api/turnaround-times')
      if (!response.ok) throw new Error('Failed to fetch turnaround times')
      const data = await response.json()
      setTurnaroundTimes(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load turnaround times')
    }
  }

  const handleSave = async () => {
    try {
      const url = editingSet
        ? `/api/turnaround-time-sets/${editingSet.id}`
        : '/api/turnaround-time-sets'

      const method = editingSet ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
          turnaroundTimeIds: formData.selectedTurnaroundTimes,
        }),
      })

      if (!response.ok) throw new Error('Failed to save set')

      toast.success(editingSet ? 'Set updated successfully' : 'Set created successfully')
      setShowDialog(false)
      fetchSets()
      resetForm()
    } catch (error) {
      toast.error('Failed to save turnaround time set')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this set?')) return

    try {
      const response = await fetch(`/api/turnaround-time-sets/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete set')

      toast.success('Set deleted successfully')
      fetchSets()
    } catch (error) {
      toast.error('Failed to delete turnaround time set')
    }
  }

  const handleDragEnd = async (event: DragEndEvent, setId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const set = sets.find((s) => s.id === setId)
    if (!set) return

    const items = set.TurnaroundTimeSetItem || []
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    const newItems = arrayMove(items, oldIndex, newIndex)

    // Update local state immediately
    setSets(sets.map((s) => (s.id === setId ? { ...s, TurnaroundTimeSetItem: newItems } : s)))

    // Save to backend
    try {
      const response = await fetch(`/api/turnaround-time-sets/${setId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: newItems.map((item) => item.id),
        }),
      })

      if (!response.ok) throw new Error('Failed to reorder items')
    } catch (error) {
      toast.error('Failed to save order')
      fetchSets() // Revert on error
    }
  }

  const handleDuplicate = async (set: TurnaroundTimeSet) => {
    try {
      const response = await fetch('/api/turnaround-time-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${set.name} (Copy)`,
          description: set.description,
          isActive: set.isActive,
          turnaroundTimeIds: (set.TurnaroundTimeSetItem || []).map((item) => item.turnaroundTimeId),
        }),
      })

      if (!response.ok) throw new Error('Failed to duplicate set')

      toast.success('Set duplicated successfully')
      fetchSets()
    } catch (error) {
      toast.error('Failed to duplicate turnaround time set')
    }
  }

  const toggleExpanded = (setId: string) => {
    setExpandedSets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(setId)) {
        newSet.delete(setId)
      } else {
        newSet.add(setId)
      }
      return newSet
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      selectedTurnaroundTimes: [],
    })
    setEditingSet(null)
  }

  const openEditDialog = (set: TurnaroundTimeSet) => {
    setEditingSet(set)
    setFormData({
      name: set.name,
      description: set.description || '',
      isActive: set.isActive,
      selectedTurnaroundTimes: (set.TurnaroundTimeSetItem || []).map(
        (item) => item.turnaroundTimeId
      ),
    })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Turnaround Time Sets</h1>
          <p className="text-gray-600 mt-1">
            Manage groups of turnaround times for different product types
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Turnaround Time Set
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : sets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No turnaround time sets found.</p>
            <Button className="mt-4" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Set
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <Card key={set.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => toggleExpanded(set.id)}
                    >
                      {expandedSets.has(set.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <CardTitle className="text-xl">{set.name}</CardTitle>
                      {set.description && <CardDescription>{set.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={set.isActive ? 'default' : 'secondary'}>
                      {set.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {set.TurnaroundTimeSetItem?.length || 0} options
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleDuplicate(set)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(set)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(set.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedSets.has(set.id) && (
                <CardContent>
                  <DndContext
                    collisionDetection={closestCenter}
                    sensors={sensors}
                    onDragEnd={(event) => handleDragEnd(event, set.id)}
                  >
                    <SortableContext
                      items={set.TurnaroundTimeSetItem?.map((item) => item.id) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {(set.TurnaroundTimeSetItem || []).map((item) => (
                          <SortableSetItem
                            key={item.id}
                            item={item}
                            onRemove={() => {}}
                            onSetDefault={() => {}}
                            onToggle={() => {}}
                            onUpdatePriceOverride={() => {}}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSet ? 'Edit Turnaround Time Set' : 'Create New Turnaround Time Set'}
            </DialogTitle>
            <DialogDescription>
              Group turnaround times together for specific product types
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Set Name</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Printing, Rush Orders"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this set"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                checked={formData.isActive}
                id="active"
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div>
              <Label>Turnaround Times</Label>
              <div className="space-y-2 mt-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
                {turnaroundTimes.map((tt) => (
                  <div key={tt.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.selectedTurnaroundTimes.includes(tt.id)}
                      id={tt.id}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            selectedTurnaroundTimes: [...formData.selectedTurnaroundTimes, tt.id],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            selectedTurnaroundTimes: formData.selectedTurnaroundTimes.filter(
                              (id) => id !== tt.id
                            ),
                          })
                        }
                      }}
                    />
                    <label className="flex-1 cursor-pointer" htmlFor={tt.id}>
                      <div>
                        <span className="font-medium">{tt.displayName}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({tt.daysMin}-{tt.daysMax || 'same'} days)
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingSet ? 'Update' : 'Create'} Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
